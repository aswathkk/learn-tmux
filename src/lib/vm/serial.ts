/**
 * The learner's serial line: guest bytes in, terminal writes out.
 *
 * Two jobs beyond plain forwarding.
 *
 * 1. Batching. v86 emits one byte at a time. Writing each one straight to xterm
 *    breaks multi-byte UTF-8 and repaints far too often, so bytes are collected
 *    and flushed once per animation frame.
 *
 * 2. Extracting files. The guest's `open` command hands a file to the browser
 *    over this same line, wrapped in OSC markers:
 *
 *      guest -> page   ESC ] 777 ; open ; <path> BEL   <contents>   ESC ] 777 ; eof BEL
 *
 *    Those bytes must never reach xterm, so the stream is parsed before it is
 *    written out. A marker can be split across two frames, which is why
 *    unmatched trailing bytes are held back rather than flushed.
 */

/** How often a hidden page drains the serial buffer, in milliseconds. */
const HIDDEN_FLUSH_MS = 100;

/** ESC ] 7 7 7 ; — the private OSC the guest's `open` command uses. */
const OSC_PREFIX = [0x1b, 0x5d, 0x37, 0x37, 0x37, 0x3b];
const BEL = 0x07;

export interface SerialSinks {
  /** Called with decoded bytes destined for the terminal. */
  write(bytes: Uint8Array): void;
  /** Called when the guest finishes handing over a file to edit. */
  openFile(path: string, contents: string): void;
}

interface MarkerMatch {
  index: number;
  /** True when the frame ended mid-sequence, so we cannot tell yet. */
  partial: boolean;
}

export class SerialStream {
  #pending: number[] = [];
  #buffered: number[] = [];
  #flushQueued = false;
  #capture: { path: string; bytes: number[] } | null = null;
  #decoder = new TextDecoder();
  #sinks: SerialSinks;

  constructor(sinks: SerialSinks) {
    this.#sinks = sinks;
  }

  /** Feed one byte from the emulator. */
  push(byte: number): void {
    this.#buffered.push(byte);
    if (this.#flushQueued) return;
    this.#flushQueued = true;

    // A frame callback is the right cadence while the page is visible: it
    // coalesces a burst of guest output into one repaint. But browsers stop
    // firing it in a background tab, and the guest keeps talking — a `tail -f`
    // left running in another tab would queue every byte and never draw. So a
    // hidden page drains on a timer instead.
    if (document.hidden) setTimeout(() => this.flush(), HIDDEN_FLUSH_MS);
    else requestAnimationFrame(() => this.flush());
  }

  /** Drop everything in flight. Used when the machine is reset under us. */
  reset(): void {
    this.#pending = [];
    this.#buffered = [];
    this.#capture = null;
  }

  #findMarker(data: number[], from: number): MarkerMatch | null {
    for (let i = from; i < data.length; i++) {
      if (data[i] !== OSC_PREFIX[0]) continue;
      let matched = true;
      for (let k = 1; k < OSC_PREFIX.length; k++) {
        if (i + k >= data.length) return { index: i, partial: true };
        if (data[i + k] !== OSC_PREFIX[k]) {
          matched = false;
          break;
        }
      }
      if (matched) return { index: i, partial: false };
    }
    return null;
  }

  flush(): void {
    this.#flushQueued = false;
    if (!this.#buffered.length && !this.#pending.length) return;

    const data = this.#pending.concat(this.#buffered);
    this.#buffered = [];
    this.#pending = [];

    const visible: number[] = [];
    let i = 0;

    while (i < data.length) {
      const sink = this.#capture ? this.#capture.bytes : visible;
      const marker = this.#findMarker(data, i);

      if (!marker) {
        for (let k = i; k < data.length; k++) sink.push(data[k]);
        break;
      }

      for (let k = i; k < marker.index; k++) sink.push(data[k]);

      const end = marker.partial ? -1 : data.indexOf(BEL, marker.index);
      if (end === -1) {
        // Hold the incomplete marker back until the next frame completes it.
        this.#pending = data.slice(marker.index);
        break;
      }

      const command = this.#decoder.decode(
        new Uint8Array(data.slice(marker.index + OSC_PREFIX.length, end)),
      );
      i = end + 1;

      if (!this.#capture && command.startsWith('open;')) {
        this.#capture = { path: command.slice('open;'.length), bytes: [] };
      } else if (this.#capture && command === 'eof') {
        const { path, bytes } = this.#capture;
        this.#capture = null;
        // The tty turns every \n into \r\n on the way out.
        const contents = this.#decoder.decode(new Uint8Array(bytes)).replace(/\r\n/g, '\n');
        this.#sinks.openFile(path, contents);
      }
    }

    if (visible.length) this.#sinks.write(new Uint8Array(visible));
  }
}
