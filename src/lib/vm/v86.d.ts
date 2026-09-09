/**
 * The slice of libv86's API this project uses.
 *
 * v86 ships no types. libv86.js is a UMD bundle served from public/vm/ and
 * loaded with a plain <script> tag rather than bundled, because it is 360 KB of
 * generated code that Vite has no reason to parse.
 */

export interface V86FilesystemOptions {
  /** Directory of content-addressed file bodies, fetched lazily over 9p. */
  baseurl: string;
  /** Directory metadata. Omitted when restoring a snapshot: the state carries it. */
  basefs?: { url: string };
}

export interface V86Options {
  wasm_path: string;
  memory_size: number;
  vga_memory_size: number;
  bios: { url: string } | { buffer: ArrayBuffer };
  vga_bios: { url: string } | { buffer: ArrayBuffer };
  bzimage?: { url: string } | { buffer: ArrayBuffer };
  cmdline?: string;
  /**
   * A URL, or the snapshot's bytes. `restore_state` sniffs the zstd magic
   * number off the buffer, so a compressed buffer restores exactly as a `.zst`
   * URL does — which is what lets src/lib/vm/snapshot.ts own the fetch.
   */
  initial_state?: { url: string } | { buffer: ArrayBuffer };
  filesystem: V86FilesystemOptions;
  /** The second serial port. The lesson harness lives here; without it there is no control channel. */
  uart1: boolean;
  autostart: boolean;
  disable_keyboard?: boolean;
  disable_mouse?: boolean;
}

export interface DownloadProgressEvent {
  loaded: number;
  total: number;
}

export interface V86Emulator {
  add_listener(event: 'serial0-output-byte', handler: (byte: number) => void): void;
  add_listener(event: 'serial1-output-byte', handler: (byte: number) => void): void;
  add_listener(event: 'emulator-started', handler: () => void): void;
  add_listener(event: 'download-progress', handler: (event: DownloadProgressEvent) => void): void;
  serial0_send(text: string): void;
  serial_send_bytes(port: number, bytes: Uint8Array): void;
  save_state(): Promise<ArrayBuffer>;
  restore_state(state: ArrayBuffer): Promise<void>;
  destroy(): void;
}

export type V86Constructor = new (options: V86Options) => V86Emulator;

declare global {
  interface Window {
    V86?: V86Constructor;
  }
}
