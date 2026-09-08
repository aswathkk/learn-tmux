/**
 * The control channel: the guest's second serial port, /dev/ttyS1.
 *
 * Everything the lesson harness does — staging a task, grading the checks —
 * runs here, so the terminal the learner is looking at only ever shows what the
 * learner did.
 *
 * `start-tmux` puts a shell on this port before it drops privileges (only root
 * can open the device) with echo off, so output comes back clean. Commands are
 * wrapped in sentinels and terminated by the exit code, which is what makes a
 * reply identifiable in a stream with no prompt.
 */
import type { V86Emulator } from './v86';

const BEGIN = '__CTL_BEGIN__';
const END = '__CTL_END__';
const CONTROL_PORT = 1;

export interface ControlResult {
  output: string;
  code: number;
}

export class ControlChannel {
  #emulator: V86Emulator | null = null;
  #buffer = '';
  #pending: (() => void) | null = null;
  /** One command at a time: the far end is a single shell. */
  #queue: Promise<unknown> = Promise.resolve();
  /** True once the shell on ttyS1 has answered at least once since the last reset. */
  #ready = false;
  #encoder = new TextEncoder();

  attach(emulator: V86Emulator): void {
    this.#emulator = emulator;
    this.reset();
  }

  /** Called for every byte the guest writes to ttyS1. */
  push(byte: number): void {
    this.#buffer += String.fromCharCode(byte);
    this.#pending?.();
  }

  /** Clear in-flight state. Required after restoring a snapshot. */
  reset(): void {
    this.#buffer = '';
    this.#pending = null;
    this.#queue = Promise.resolve();
    this.#ready = false;
  }

  /**
   * Whether the channel is known to be answering.
   *
   * Callers use this to decide whether a command can go down the control
   * channel or has to be typed into the learner's terminal instead.
   */
  get isReady(): boolean {
    return this.#ready;
  }

  /**
   * The tty adds CRs, and the shell's line editor asks for the cursor position
   * on every prompt. Neither belongs in a command's output.
   */
  #clean(text: string): string {
    return text.replace(/\r/g, '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
  }

  #once(command: string, timeoutMs: number): Promise<ControlResult> {
    return new Promise((resolve, reject) => {
      const emulator = this.#emulator;
      if (!emulator) {
        reject(new Error('no machine'));
        return;
      }
      this.#buffer = '';

      const script =
        `printf '\\n%s\\n' ${BEGIN}; { ${command} ; } 2>&1; ` +
        `printf '\\n%s%s\\n' ${END} "$?"\n`;

      const timer = setTimeout(() => {
        this.#pending = null;
        reject(new Error(`control timeout: ${command}`));
      }, timeoutMs);

      this.#pending = () => {
        const text = this.#clean(this.#buffer);
        const start = text.indexOf(BEGIN + '\n');
        if (start === -1) return;
        const rest = text.slice(start + BEGIN.length + 1);
        const stop = rest.indexOf(END);
        if (stop === -1) return;
        const code = /^(\d+)/.exec(rest.slice(stop + END.length));
        if (!code) return;

        clearTimeout(timer);
        this.#pending = null;
        this.#ready = true;
        resolve({ output: rest.slice(0, stop).replace(/\n$/, ''), code: Number(code[1]) });
      };

      emulator.serial_send_bytes(CONTROL_PORT, this.#encoder.encode(script));
    });
  }

  /** Run one command on the guest and wait for its output and exit code. */
  run(command: string, timeoutMs = 15_000): Promise<ControlResult> {
    const next = () => this.#once(command, timeoutMs);
    const result = this.#queue.then(next, next);
    // Keep the chain alive even when a command rejects.
    this.#queue = result.catch(() => undefined);
    return result;
  }

  /** Poll until the control shell answers. It comes back with a snapshot, but not instantly. */
  async waitUntilReady(attempts = 20, intervalMs = 250): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      try {
        const { output } = await this.run('printf control-ok', 2000);
        if (output.includes('control-ok')) return true;
      } catch {
        // not up yet
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
  }
}
