#!/usr/bin/env bun
/**
 * Boot the machine headlessly, chroot into Alpine, then snapshot it.
 *
 *   bun run guest/make-state.ts [memory-mb] [out]
 *
 * The snapshot is what makes the terminal usable: restoring it skips the kernel
 * boot entirely, so the page is at a prompt in ~0.4 s instead of ~15 s.
 *
 * It embeds 9p inode metadata, so it MUST be regenerated after every
 * guest/build.sh or the guest wakes with a view of a filesystem that no longer
 * exists.
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zstdCompressSync, constants as zlibConstants } from 'node:zlib';

// The state's own memory size wins over `memory_size` at restore time, so this
// number is the one the browser ends up with. 64 MB leaves room for a few panes
// and costs about 1 MB of snapshot.
const MEMORY_MB = Number(process.argv[2]) || 64;
const OUT = process.argv[3] || 'public/vm/state.bin';

// Not import.meta.dir: that is Bun-only, and this file is type-checked
// against the standard lib alongside the rest of the repo.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public/vm') + '/';

// libv86 is a UMD bundle; Bun loads it as CommonJS.
const { V86 } = require(join(PUBLIC, 'libv86.js'));

const read = (path: string): ArrayBuffer => {
  const buffer = readFileSync(PUBLIC + path);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

const emulator = new V86({
  wasm_path: PUBLIC + 'v86.wasm',
  memory_size: MEMORY_MB * 1024 * 1024,
  vga_memory_size: 2 * 1024 * 1024,
  bios: { buffer: read('seabios.bin') },
  vga_bios: { buffer: read('vgabios.bin') },
  bzimage: { buffer: read('bzimage.bin') },
  cmdline: 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on',
  filesystem: { basefs: { url: PUBLIC + 'fs.json' }, baseurl: PUBLIC + 'rootfs/' },
  // Must match the browser: without uart1 the control channel's serial port
  // does not exist, and the snapshot will not contain the control shell.
  uart1: true,
  autostart: true,
});

/** Drop SGR colour sequences, so a styled prompt still matches. */
function stripSgr(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

let tail = '';
let controlTail = '';
let stage = 0;
const startedAt = Date.now();
const encoder = new TextEncoder();

/**
 * Everything this script runs, it runs on the guest's second serial port.
 *
 * The learner's shell must be pristine in the snapshot: a command typed into it
 * here stays in that shell's history, so the first Up-arrow of Lesson 1 would
 * offer `find / -xdev -type f -exec cat {} +`. The control channel is exactly
 * the side door the lesson harness uses at runtime, for the same reason.
 */
function control(command: string): void {
  emulator.serial_send_bytes(1, encoder.encode(command + '\n'));
}

emulator.add_listener('serial0-output-byte', (byte: number) => {
  tail = (tail + String.fromCharCode(byte)).slice(-64);

  if (stage === 0 && tail.includes('~% ')) {
    // Buildroot's prompt: the kernel is up and the 9p share is mounted.
    stage = 1;
    emulator.serial0_send('sh /mnt/v86-boot.sh 100 30\n');
  } else if (stage === 1 && /~ ?[#$] $/.test(stripSgr(tail))) {
    // A login shell is prompting from the home directory, so the chroot is up
    // and start-tmux has put the control shell on ttyS1.
    //
    // Colour is stripped and the hostname is not required: the prompt is the
    // guest's to style, and editing /etc/profile.d/prompt.sh must not stall
    // this script.
    stage = 2;
    // Read the whole rootfs once before snapshotting. v86 re-downloads a 9p
    // file on every read that misses, so a cold guest page cache costs several
    // MB of duplicate traffic the moment tmux starts. Warming it here puts
    // those pages inside the snapshot instead.
    control(
      'find / -xdev -type f -exec cat {} + > /dev/null 2>&1; ' +
        'tmux new -d -s warm && tmux kill-server; ' +
        // Nothing this script did should be visible to the learner.
        'rm -f /home/alpine/.ash_history; ' +
        'echo WARM_DONE',
    );
  }
});

emulator.add_listener('serial1-output-byte', (byte: number) => {
  controlTail = (controlTail + String.fromCharCode(byte)).slice(-32);
  if (stage === 2 && controlTail.includes('WARM_DONE')) {
    stage = 3;
    setTimeout(snapshot, 2000);
  }
});

async function snapshot(): Promise<void> {
  const bootSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const state: ArrayBuffer = await emulator.save_state();

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, Buffer.from(state));

  // libv86 decompresses by URL suffix, so the browser only ever needs the .zst.
  // The raw file stays for local work.
  const packed = zstdCompressSync(Buffer.from(state), {
    params: { [zlibConstants.ZSTD_c_compressionLevel]: 19 },
  });
  writeFileSync(OUT + '.zst', packed);

  const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
  console.log(
    `${MEMORY_MB}MB  boot=${bootSeconds}s  raw=${mb(statSync(OUT).size)} MB  ` +
      `zstd=${mb(packed.length)} MB  ${OUT}[.zst]`,
  );
  process.exit(0);
}

setTimeout(() => {
  console.error(`timeout at stage ${stage}`);
  process.exit(1);
}, 90_000);
