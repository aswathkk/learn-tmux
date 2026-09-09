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
 *      guest -> page   ESC ] 777 ; open ; <path> ST   <base64>   ESC ] 777 ; eof ; <bytes> ST
 *
 *    Those bytes must never reach xterm, so the stream is parsed before it is
 *    written out. A marker can be split across two frames, which is why
 *    unmatched trailing bytes are held back rather than flushed.
 *
 *    The contents are base64 and the markers end in ST (ESC \) rather than BEL
 *    because inside tmux the whole exchange travels through tmux's DCS
 *    passthrough, which drops C0 control bytes — newlines, tabs and BEL alike.
 *    See guest/rootfs/usr/local/bin/open. BEL is still accepted as a
 *    terminator, since it is what every other OSC on this line uses.
 */

/** How often a hidden page drains the serial buffer, in milliseconds. */
const HIDDEN_FLUSH_MS = 100;

/** ESC ] 7 7 7 ; — the private OSC the guest's `open` command uses. */
const OSC_PREFIX = [0x1b, 0x5d, 0x37, 0x37, 0x37, 0x3b];
const BEL = 0x07;
const ESC = 0x1b;
const BACKSLASH = 0x5c;

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

/** Where an OSC ends. `start` is the terminator itself, `next` the byte after it. */
interface Terminator {
  start: number;
  next: number;
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

  #findTerminator(data: number[], from: number): Terminator | null {
    for (let i = from; i < data.length; i++) {
      if (data[i] === BEL) return { start: i, next: i + 1 };
      if (data[i] !== ESC) continue;
      // A trailing ESC is not yet a decision: the next frame may complete an ST.
      if (i + 1 >= data.length) return null;
      if (data[i + 1] === BACKSLASH) return { start: i, next: i + 2 };
    }
    return null;
  }

  /**
   * The captured payload is base64, and the tty may have broken it over lines.
   *
   * Everything here is refusing a payload rather than repairing one. Nothing
   * else should be writing to this line while `open` holds it, but if
   * something does, base64 is unframed enough to absorb the intrusion and
   * still decode — into garbage that looks enough like a file for the next
   * save to write it back. So line breaks are dropped, anything else is fatal,
   * and `expected` (counted from the file itself, guest-side) has the last
   * word: a run of stray characters that happens to be valid base64 changes
   * the length even when it survives every other check.
   */
  #decodeContents(bytes: number[], expected: number): string | null {
    const b64 = this.#decoder.decode(new Uint8Array(bytes)).replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) return null;
    try {
      const binary = atob(b64);
      if (!Number.isInteger(expected) || binary.length !== expected) return null;
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
      return this.#decoder.decode(out);
    } catch {
      // Handing the editor a file it could not read would let a save truncate
      // the real one, so nothing is opened.
      return null;
    }
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

      const end = marker.partial
        ? null
        : this.#findTerminator(data, marker.index + OSC_PREFIX.length);
      if (!end) {
        // Hold the incomplete marker back until the next frame completes it.
        this.#pending = data.slice(marker.index);
        break;
      }

      const command = this.#decoder.decode(
        new Uint8Array(data.slice(marker.index + OSC_PREFIX.length, end.start)),
      );
      i = end.next;

      if (!this.#capture && command.startsWith('open;')) {
        this.#capture = { path: command.slice('open;'.length), bytes: [] };
      } else if (this.#capture && command.startsWith('eof;')) {
        const { path, bytes } = this.#capture;
        this.#capture = null;
        const contents = this.#decodeContents(bytes, Number(command.slice('eof;'.length)));
        if (contents !== null) this.#sinks.openFile(path, contents);
        else console.error(`open: could not decode ${path}`);
      }
    }

    if (visible.length) this.#sinks.write(new Uint8Array(visible));
  }
}
