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
 *
 * One command is on the wire at a time, and it owns the channel while it is
 * there: only the command that is still current may take itself off. That rule
 * is the whole reason `#abandon` exists beside `#pending`. Without it a command
 * that nobody is waiting for any more — one whose machine was replaced under it
 * by a snapshot restore — still held a live timer, and when that timer fired it
 * cleared the reply parser belonging to whatever command was running by then.
 * The victim could never be answered, so it timed out on its own budget (2s for
 * a probe, 20s for a lesson's setup) and cleared the next one in turn.
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
  /** The current command's reply parser, run for every byte the guest sends. */
  #pending: (() => void) | null = null;
  /**
   * Ends the current command: clears its timer and rejects it.
   *
   * Held next to `#pending` so `reset()` can finish a command the guest is
   * never going to answer, rather than walking away and leaving its timer to
   * fire into a later command's turn.
   */
  #abandon: ((reason: string) => void) | null = null;
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

  /**
   * Clear in-flight state. Required after restoring a snapshot.
   *
   * A command still on the wire here is one the guest will never answer: the
   * machine it was sent to has just been replaced. It is ended now, on the spot,
   * so its caller retries against the machine that actually exists — and so its
   * timer is not left armed to land on someone else's command later.
   */
  reset(): void {
    this.#abandon?.('control channel reset');
    this.#buffer = '';
    this.#pending = null;
    this.#abandon = null;
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

      /**
       * Take this command off the wire.
       *
       * The timer is always dropped — it belongs to this command whatever else
       * has happened. The channel's own slots are only cleared if this command
       * is still the one holding them: a timeout that fires after `reset()` has
       * moved on must not clear the parser of the command that moved in.
       */
      const settle = (): void => {
        clearTimeout(timer);
        if (this.#pending === handler) {
          this.#pending = null;
          this.#abandon = null;
        }
      };

      const timer = setTimeout(() => {
        settle();
        reject(new Error(`control timeout: ${command}`));
      }, timeoutMs);

      const handler = (): void => {
        const text = this.#clean(this.#buffer);
        const start = text.indexOf(BEGIN + '\n');
        if (start === -1) return;
        const rest = text.slice(start + BEGIN.length + 1);
        const stop = rest.indexOf(END);
        if (stop === -1) return;
        const code = /^(\d+)/.exec(rest.slice(stop + END.length));
        if (!code) return;

        settle();
        this.#ready = true;
        resolve({ output: rest.slice(0, stop).replace(/\n$/, ''), code: Number(code[1]) });
      };

      this.#pending = handler;
      this.#abandon = (reason: string) => {
        settle();
        reject(new Error(`${reason}: ${command}`));
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
