/**
 * The machine: v86 lifecycle, wired to a terminal and a control channel.
 *
 * Boot is explicit and never happens on page load. The emulator is 2.1 MB of
 * WebAssembly plus a 12 MB snapshot, and it runs an x86 CPU on the main thread;
 * starting it before the learner has asked for a terminal would wreck the
 * page's load metrics for no benefit. The page calls `boot()` on a gesture or
 * when the terminal scrolls into view.
 */
import { ControlChannel } from './control';
import { SerialStream } from './serial';
import { loadSnapshot } from './snapshot';
import { stripTerminalReports } from './input-filter';
import { controlResizeCommand, TerminalView } from './terminal';
import type { DownloadProgressEvent, V86Constructor, V86Emulator, V86Options } from './v86';

/** Where the guest's files are served from. Everything under here is gitignored. */
const VM_BASE = '/vm/';

/**
 * How long the machine gets to reach a prompt. The snapshot path is normally
 * under a second on a warm cache; this only exists so a stale or missing
 * snapshot surfaces as an error instead of a hang.
 */
const BOOT_TIMEOUT_MS = 60_000;
const LIBV86_URL = `${VM_BASE}libv86.js`;

export type MachineStatus = 'idle' | 'loading' | 'booting' | 'ready' | 'failed';

export interface MachineEvents {
  status(status: MachineStatus, detail: string): void;
  progress(fraction: number): void;
  openFile(path: string, contents: string): void;
}

export interface MachineOptions {
  container: HTMLElement;
  events: Partial<MachineEvents>;
  /** Guest RAM. The snapshot's own size wins on the restore path. */
  memoryMb?: number;
  /** Skip the snapshot and boot the kernel. Slow; useful when the snapshot is stale. */
  coldBoot?: boolean;
}

let libv86Loading: Promise<V86Constructor> | null = null;

/**
 * libv86 is a UMD bundle served as a static file, not an npm dependency: it is
 * 360 KB of generated code Vite has no reason to parse, and it must sit next to
 * v86.wasm. Loaded once, on demand.
 */
function loadLibV86(): Promise<V86Constructor> {
  if (window.V86) return Promise.resolve(window.V86);
  if (libv86Loading) return libv86Loading;

  libv86Loading = new Promise<V86Constructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LIBV86_URL;
    script.async = true;
    script.onload = () => {
      if (window.V86) resolve(window.V86);
      else reject(new Error('libv86 loaded but did not define V86'));
    };
    script.onerror = () => reject(new Error(`could not load ${LIBV86_URL}`));
    document.head.append(script);
  });
  return libv86Loading;
}

export class TmuxMachine {
  readonly control = new ControlChannel();
  readonly view: TerminalView;

  #emulator: V86Emulator | null = null;
  #serial: SerialStream;
  #events: Partial<MachineEvents>;
  #options: MachineOptions;
  #booted = false;
  #bootPromise: Promise<void> | null = null;
  /**
   * Resolved when the machine reaches a usable prompt, not when the emulator
   * object exists. Constructing v86 and reaching a prompt are seconds apart,
   * and anything that touches the guest in between — a snapshot, a command —
   * fails against a machine that has not started.
   */
  #readyResolve: (() => void) | null = null;
  #readyReject: ((error: Error) => void) | null = null;
  /** Rolling tail of guest output, only used to spot the buildroot prompt on a cold boot. */
  #tail = '';
  /** A snapshot of the ready machine, kept in memory so a task can reset without downloading. */
  #baseline: ArrayBuffer | null = null;

  constructor(options: MachineOptions) {
    this.#options = options;
    this.#events = options.events;

    this.#serial = new SerialStream({
      write: (bytes) => this.view.write(bytes),
      openFile: (path, contents) => this.#events.openFile?.(path, contents),
    });

    this.view = new TerminalView({
      container: options.container,
      // xterm answers tmux's capability queries on this same callback. Those
      // answers are not input and must not reach the guest's shell.
      onData: (data) => {
        const input = stripTerminalReports(data);
        if (input) this.send(input);
      },
      onResize: () => this.applySize(),
    });
  }

  get isBooted(): boolean {
    return this.#booted;
  }

  get hasBaseline(): boolean {
    return this.#baseline !== null;
  }

  #status(status: MachineStatus, detail: string): void {
    this.#events.status?.(status, detail);
  }

  send(text: string): void {
    this.#emulator?.serial0_send(text);
  }

  /**
   * Start the machine and resolve once it is at a prompt.
   *
   * Idempotent: repeated calls return the same in-flight boot, so a lesson that
   * starts while the machine is still restoring simply waits for it.
   */
  boot(): Promise<void> {
    if (this.#bootPromise) return this.#bootPromise;

    const ready = new Promise<void>((resolve, reject) => {
      this.#readyResolve = resolve;
      this.#readyReject = reject;
    });

    // A machine that never reaches a prompt must fail loudly rather than
    // leaving every await in the harness hanging.
    const timeout = setTimeout(
      () => this.#readyReject?.(new Error('the machine did not reach a prompt in time')),
      BOOT_TIMEOUT_MS,
    );

    this.#bootPromise = this.#boot()
      .then(() => ready)
      .then(() => {
        clearTimeout(timeout);
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        // Let a later attempt retry from scratch rather than replaying this failure.
        this.#bootPromise = null;
        this.#status(
          'failed',
          error instanceof Error ? error.message : 'could not start the machine',
        );
        throw error;
      });

    return this.#bootPromise;
  }

  async #boot(): Promise<void> {
    this.#status('loading', 'loading the emulator');
    const V86 = await loadLibV86();

    this.#booted = false;
    this.#tail = '';
    this.view.reset();
    this.#serial.reset();
    this.#status('booting', this.#options.coldBoot ? 'booting the kernel' : 'restoring the machine');

    const useSnapshot = !this.#options.coldBoot;

    const config: V86Options = {
      wasm_path: `${VM_BASE}v86.wasm`,
      memory_size: (this.#options.memoryMb ?? 64) * 1024 * 1024,
      vga_memory_size: 2 * 1024 * 1024,
      bios: { url: `${VM_BASE}seabios.bin` },
      vga_bios: { url: `${VM_BASE}vgabios.bin` },
      // The lesson harness drives the guest through this second port.
      uart1: true,
      autostart: true,
      // Everything reaches the guest over the serial line; nothing is drawn on
      // the emulated VGA and no input goes through the emulated devices.
      disable_keyboard: true,
      disable_mouse: true,
      filesystem: { baseurl: `${VM_BASE}rootfs/` },
    };

    if (useSnapshot) {
      // The snapshot carries the RAM, the devices and the 9p metadata, so there
      // is no kernel to load and no fs.json to parse. Passing basefs here would
      // be ignored anyway: libv86 takes the filesystem from the state.
      //
      // Handed over as bytes rather than a URL because the browser refuses to
      // cache a file this size: snapshot.ts fetches it, revalidates it and
      // keeps it in the Cache API instead.
      config.initial_state = {
        buffer: await loadSnapshot(`${VM_BASE}state.bin.zst`, (fraction) =>
          this.#events.progress?.(fraction),
        ),
      };
    } else {
      config.bzimage = { url: `${VM_BASE}bzimage.bin` };
      config.cmdline = 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on';
      config.filesystem.basefs = { url: `${VM_BASE}fs.json` };
    }

    const emulator = new V86(config);
    this.#emulator = emulator;
    this.control.attach(emulator);

    emulator.add_listener('serial0-output-byte', (byte) => this.#onSerialByte(byte));
    emulator.add_listener('serial1-output-byte', (byte) => this.control.push(byte));
    // Only on the cold path. Restoring, the snapshot is already in hand and is
    // 98% of the bytes; letting v86 report the 167 KB of BIOS it fetches after
    // that would drag a full bar back to zero.
    if (!useSnapshot) {
      emulator.add_listener('download-progress', (event: DownloadProgressEvent) => {
        if (!event.total || this.#booted) return;
        this.#events.progress?.(event.loaded / event.total);
      });
    }

    if (useSnapshot) {
      emulator.add_listener('emulator-started', () => this.#resumeFromSnapshot());
    } else {
      emulator.add_listener('emulator-started', () => this.#status('booting', 'kernel booting'));
      // The 9p mount usually appears within a few seconds; nudge it if the
      // prompt scrolled past unnoticed, then give up and try anyway.
      setTimeout(() => {
        if (!this.#booted) this.send('\n');
      }, 20_000);
      setTimeout(() => {
        if (!this.#booted) this.#enterAlpine();
      }, 30_000);
    }
  }

  #onSerialByte(byte: number): void {
    this.#serial.push(byte);

    // Only meaningful on a cold boot: buildroot's shell prompt means the kernel
    // is up and the 9p share is mounted, which is the cue to chroot into Alpine.
    if (!this.#booted && this.#options.coldBoot) {
      this.#tail = (this.#tail + String.fromCharCode(byte)).slice(-16);
      if (this.#tail.includes('~% ')) this.#enterAlpine();
    }
  }

  #enterAlpine(): void {
    if (this.#booted) return;
    this.#booted = true;
    const { cols, rows } = this.view.size;
    this.#status('booting', 'entering the Alpine rootfs');
    this.send(`sh /mnt/v86-boot.sh ${cols} ${rows}\n`);
    setTimeout(() => this.#markReady(), 1500);
  }

  /**
   * Restoring lands the machine at an idle Alpine prompt: nothing is printed,
   * and no buildroot prompt will ever appear. Anything that waits for boot
   * output waits forever, so mark it live here and redraw instead.
   */
  #resumeFromSnapshot(): void {
    if (this.#booted) return;
    this.#booted = true;
    this.#status('booting', 'restored from snapshot');

    setTimeout(async () => {
      this.view.fit();
      // applySize waits for the control shell itself, so nothing is ever typed
      // into the learner's terminal to size it.
      this.view.pushSizeNow();

      // A restored machine prints nothing: it wakes at a prompt it already
      // drew, into an xterm that was reset, so the screen is blank until the
      // learner touches it. Ctrl-L asks the shell's line editor to repaint —
      // it is a keystroke, not a command, so it leaves no trace in history.
      this.send('\x0c');

      this.#markReady();
    }, 150);
  }

  #markReady(): void {
    const { cols, rows } = this.view.size;
    this.#status('ready', `Alpine i386 + tmux · ${cols}×${rows}`);
    this.#events.progress?.(0);
    this.view.focus();
    // Only now is the guest real enough to snapshot or take a command.
    this.#readyResolve?.();
    this.#readyResolve = null;
    this.#readyReject = null;
  }

  /** Take the in-memory baseline used by "reset task". Cheap to call twice. */
  async captureBaseline(): Promise<void> {
    if (this.#baseline || !this.#emulator) return;
    try {
      this.#baseline = await this.#emulator.save_state();
    } catch (error) {
      console.warn('baseline snapshot failed', error);
    }
  }

  /**
   * Put the machine back exactly as it was at the prompt. No download, no
   * reboot, so a task can be restarted as often as the learner likes.
   */
  async restoreBaseline(): Promise<boolean> {
    if (!this.#baseline || !this.#emulator) return false;
    // restore_state consumes the buffer, so hand it a copy each time.
    await this.#emulator.restore_state(this.#baseline.slice(0));
    this.control.reset();
    this.#serial.reset();
    this.view.reset();
    return true;
  }

  /**
   * Push the current terminal size into the guest.
   *
   * This is a command, not a signal: a serial line carries no SIGWINCH, so it
   * has to be run *somewhere* — and never in the learner's terminal. Typing it
   * there puts `stty rows … cols …` into whatever pane they are working in, and
   * leaves it in their shell history before they have typed anything of their
   * own. It waits for the control shell instead, which arrives with the
   * snapshot; if that never answers, the lesson could not run anyway.
   */
  applySize(): void {
    if (!this.#booted) return;
    const { cols, rows } = this.view.size;
    void this.#resizeGuest(cols, rows);
  }

  async #resizeGuest(cols: number, rows: number): Promise<void> {
    if (!this.control.isReady && !(await this.control.waitUntilReady(20, 100))) return;
    try {
      // `refresh-client` makes tmux repaint at the new size; harmless when no
      // client is attached.
      const { code, output } = await this.control.run(controlResizeCommand(cols, rows), 5000);
      // Worth saying out loud: a silently failing resize leaves the guest at
      // its boot-time size while the window says otherwise, and every lesson
      // then renders into the wrong number of columns.
      if (code !== 0) console.warn('guest resize failed', { code, output });
    } catch (error) {
      console.warn('guest resize did not complete', error);
    }
  }

  destroy(): void {
    this.#emulator?.destroy();
    this.#emulator = null;
    this.#baseline = null;
    this.#booted = false;
    this.#bootPromise = null;
    this.view.dispose();
  }
}
