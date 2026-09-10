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
import { loadSnapshot, SNAPSHOT_URL } from './snapshot';
import { stripTerminalReports } from './input-filter';
import { controlResizeCommand, TerminalView } from './terminal';
import type {
  DownloadProgressEvent,
  V86Constructor,
  V86Cpu,
  V86Emulator,
  V86Options,
} from './v86';

/** Where the guest's files are served from. Everything under here is gitignored. */
const VM_BASE = '/vm/';

/**
 * How long the machine gets to reach a prompt. The snapshot path is normally
 * under a second on a warm cache; this only exists so a stale or missing
 * snapshot surfaces as an error instead of a hang.
 */
const BOOT_TIMEOUT_MS = 60_000;
const LIBV86_URL = `${VM_BASE}libv86.js`;

/**
 * The guest's TSC rate: v86 advances the counter at a nominal gigahertz, and
 * the kernel calibrates to exactly that ("tsc: Detected 1000.000 MHz").
 */
const TSC_HZ = 1_000_000_000;

/**
 * How far to push the clock after restoring the downloaded snapshot.
 *
 * Far enough to clear the few seconds the snapshot had been up when it was
 * taken, with room for a slower build; well inside the fifteen minutes past
 * which a single step overflows the kernel's cycle-to-nanosecond arithmetic
 * (its `max_idle_ns`).
 */
const RESTORED_CLOCK_ADVANCE_S = 60;

export type MachineStatus = 'idle' | 'loading' | 'booting' | 'ready' | 'failed';

export interface MachineEvents {
  status(status: MachineStatus, detail: string): void;
  /**
   * How much of the machine has arrived, as a fraction. It only ever counts
   * up: a finished download stays finished on whatever draws it, which used to
   * be a bar that wanted zeroing at boot and is now the mark on the loading
   * screen, which does not.
   */
  progress(fraction: number): void;
  openFile(path: string, contents: string): void;
  /**
   * The fitted grid settled on a new size. The guest is told by `applySize`
   * either way; this is for the page's own status line, which used to be
   * written once at boot and then quietly lie for the rest of the session —
   * most visibly on the way into full screen, where the grid doubles.
   */
  resize(cols: number, rows: number): void;
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
  /** The guest's counter as the baseline was taken; put back exactly on restore. See #setTsc. */
  #baselineTsc: bigint | null = null;
  /** When the guest last wrote to the learner's terminal, and how much in all. See `whenDrawn`. */
  #lastOutputAt = 0;
  #outputBytes = 0;

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
      onResize: (cols, rows) => {
        this.applySize();
        this.#events.resize?.(cols, rows);
      },
    });
  }

  get isBooted(): boolean {
    return this.#booted;
  }

  get hasBaseline(): boolean {
    return this.#baseline !== null;
  }

  /**
   * The emulator itself, for the console and nothing else: the debugging
   * handle the pages install (`__learntmux.machine.emulator.v86.cpu`) is the
   * only practical way to look at the guest's clock or devices in someone
   * else's browser. Null until `boot()` has constructed it.
   */
  get emulator(): V86Emulator | null {
    return this.#emulator;
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
        buffer: await loadSnapshot(SNAPSHOT_URL, (fraction) =>
          this.#events.progress?.(fraction),
        ),
      };
    } else {
      config.bzimage = { url: `${VM_BASE}bzimage.bin` };
      config.cmdline = 'console=ttyS0 mitigations=off random.trust_cpu=on';
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
    this.#lastOutputAt = performance.now();
    this.#outputBytes++;
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
    this.#advanceClock(RESTORED_CLOCK_ADVANCE_S);

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

  /**
   * The guest's time stamp counter, as v86 keeps it: an offset from host time.
   */
  #readTsc(cpu: V86Cpu): bigint {
    cpu.store_current_tsc();
    const [low = 0, high = 0] = cpu.current_tsc;
    return (BigInt(high) << 32n) | BigInt(low);
  }

  /**
   * Set the counter to exactly `value`.
   *
   * v86's `set_tsc` is relative to the offset it already holds: it reads the
   * counter *through* that offset and subtracts, so one call lands at `value`
   * plus whatever offset was there, not at `value`. Its own restore is caught
   * by this — `set_state` hands it the saved counter over an offset that is
   * never zero, and the machine comes back with its clock somewhere else. So:
   * set the counter to what it reads now, which leaves the offset at zero,
   * and only then to the value wanted.
   */
  #setTsc(cpu: V86Cpu, value: bigint): void {
    const now = this.#readTsc(cpu);
    cpu.set_tsc(Number(now & 0xffffffffn), Number(now >> 32n));
    cpu.set_tsc(Number(value & 0xffffffffn), Number(value >> 32n));
  }

  /**
   * Move the guest's clock forward, after restoring the downloaded snapshot.
   *
   * The snapshot was taken in another process, and its counter does not come
   * back where it was: v86 restores it through `set_tsc`, which lands relative
   * to the offset this emulator already holds (see `#setTsc`), and from a
   * snapshot made elsewhere that is below the last value the kernel read. The
   * kernel keeps time off that counter and clamps a backwards step to no step
   * at all, so time stands still until the counter climbs back past that
   * value — 4.65 seconds, for a snapshot that had been up 4.65 seconds — and
   * everything that waits on a clock waits with it. `tmux attach` could not
   * connect for the whole of it, and the lesson opened onto a terminal with
   * the command echoed and nothing else.
   *
   * A forward step is harmless, so the machine is pushed clear of anything the
   * snapshot can have read. The in-memory baseline is taken after this and put
   * back exactly (see `restoreBaseline`), so nothing later steps backwards.
   * Measured on the guest's own uptime: frozen for 4.6 seconds before, ticking
   * from the first read after.
   */
  #advanceClock(seconds: number): void {
    const cpu = this.#emulator?.v86?.cpu;
    if (!cpu) return;
    this.#setTsc(cpu, this.#readTsc(cpu) + BigInt(seconds * TSC_HZ));
  }

  #markReady(): void {
    const { cols, rows } = this.view.size;
    this.#status('ready', `Alpine i386 + tmux · ${cols}×${rows}`);
    this.view.focus();
    // Only now is the guest real enough to snapshot or take a command.
    this.#readyResolve?.();
    this.#readyResolve = null;
    this.#readyReject = null;
  }

  /** Bytes the guest has written to the learner's terminal since the machine was made. */
  get outputBytes(): number {
    return this.#outputBytes;
  }

  /**
   * Resolve once something typed into the learner's terminal has been
   * answered on it, and the answer has finished arriving.
   *
   * `mark` is `outputBytes` from just before the line was sent, and `budget`
   * is the most the shell's echo of that line can come to. Everything past the
   * two together is the program the line started, drawing itself — so this
   * waits for that, and then for the wire to go quiet.
   *
   * Measured on the wire, at the byte, rather than at the terminal: the serial
   * stream draws once a frame, so on a page that is being looked at the two
   * are a frame apart, and the wire is the one that cannot be throttled out
   * from under a background tab.
   *
   * It exists because a fixed wait is not a signal. `tmux attach` answers in
   * a tenth of a second on a machine that is keeping up, and it answered in
   * five on one whose clock had stalled after the snapshot restore (see
   * `#advanceClock`, which is why it no longer does). Whatever is timed off a
   * fixed beat — a loading screen lifting, a snapshot of what was "already
   * true" — lands over a terminal with the command echoed on it and nothing
   * else, the moment a machine is slower than the beat allowed for.
   *
   * Bounded twice: a program that prints nothing would otherwise hold the
   * caller until the first deadline, and one that never stops printing until
   * the second. Both are the whole page waiting.
   */
  async whenDrawn(
    mark: number,
    budget: number,
    { maxWaitMs = 10_000, quietMs = 150, quietMaxMs = 2000 } = {},
  ): Promise<void> {
    const deadline = performance.now() + maxWaitMs;
    while (this.#outputBytes <= mark + budget && performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await this.#whenQuiet(quietMs, quietMaxMs);
  }

  /** Resolve once no byte has arrived for `quietMs`, or `maxWaitMs` has passed. */
  async #whenQuiet(quietMs: number, maxWaitMs: number): Promise<void> {
    const deadline = performance.now() + maxWaitMs;
    for (;;) {
      const now = performance.now();
      const wait = quietMs - (now - this.#lastOutputAt);
      if (wait <= 0 || now >= deadline) return;
      await new Promise((resolve) => setTimeout(resolve, Math.min(wait, deadline - now)));
    }
  }

  /** Take the in-memory baseline used by "reset task". Cheap to call twice. */
  async captureBaseline(): Promise<void> {
    if (this.#baseline || !this.#emulator) return;
    try {
      this.#baseline = await this.#emulator.save_state();
      // Saving stores the counter as part of the state; this is that value,
      // read back so the restore can land on it exactly.
      const cpu = this.#emulator.v86?.cpu;
      if (cpu) {
        const [low = 0, high = 0] = cpu.current_tsc;
        this.#baselineTsc = (BigInt(high) << 32n) | BigInt(low);
      }
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
    // The restore's own attempt at the counter lands wide of where it was
    // taken (see #setTsc), and the kernel inside the baseline has read the
    // real value: anything lower than that stops its clock until the counter
    // catches up, anything higher is a harmless jump. Exact is best.
    const cpu = this.#emulator.v86?.cpu;
    if (cpu && this.#baselineTsc !== null) this.#setTsc(cpu, this.#baselineTsc);
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
