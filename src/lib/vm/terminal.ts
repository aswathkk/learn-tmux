/**
 * The xterm.js side: sizing, theming, and pushing the size into the guest.
 *
 * A serial line carries no SIGWINCH, so resizing is not something the terminal
 * can do on its own. The page has to tell the guest its new size as a command.
 */
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

/**
 * The terminal palette, read from the stylesheet rather than restated here.
 *
 * xterm takes colours as strings, not as custom properties, so the values have
 * to be resolved once at construction. They were previously seventeen literals
 * under a comment claiming they matched src/styles/global.css — a second
 * palette that nothing checked and nothing would break if it drifted. Six of
 * its hues had no token anywhere in the brand, and its brightBlack (#5b6472,
 * 3.35:1 on the terminal ground) is what tmux paints inactive window labels in.
 *
 * The fallbacks are the ground and the two text colours only: enough for the
 * terminal to be legible if this ever runs before the stylesheet resolves.
 */
function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readTheme(): ITheme {
  return {
    background: token('--color-ink-term', '#07080a'),
    foreground: token('--color-term', '#c3c9d2'),
    cursor: token('--color-accent', '#3ddc84'),
    cursorAccent: token('--color-ink-term', '#07080a'),
    selectionBackground: token('--color-term-selection', '#264f78'),
    black: token('--color-ansi-black', '#0a0b0e'),
    red: token('--color-ansi-red', '#ff6b6b'),
    green: token('--color-ansi-green', '#3ddc84'),
    yellow: token('--color-ansi-yellow', '#ffd479'),
    blue: token('--color-ansi-blue', '#6cb6ff'),
    magenta: token('--color-ansi-magenta', '#d2a8ff'),
    cyan: token('--color-ansi-cyan', '#76e3ea'),
    white: token('--color-ansi-white', '#c3c9d2'),
    brightBlack: token('--color-ansi-bright-black', '#77808f'),
    brightGreen: token('--color-ansi-bright-green', '#7bf0ad'),
    brightWhite: token('--color-ansi-bright-white', '#e6e9ee'),
  };
}

export interface TerminalViewOptions {
  container: HTMLElement;
  /** Called with keystrokes the learner types. */
  onData(data: string): void;
  /** Called when the fitted size changes, after it settles. */
  onResize(cols: number, rows: number): void;
}

export class TerminalView {
  readonly terminal: Terminal;
  #fit = new FitAddon();
  #container: HTMLElement;
  #onResize: TerminalViewOptions['onResize'];
  #resizeTimer: ReturnType<typeof setTimeout> | null = null;
  #settleTimer: ReturnType<typeof setTimeout> | null = null;
  #observer: ResizeObserver | null = null;
  #lastCols = 0;
  #lastRows = 0;

  constructor(options: TerminalViewOptions) {
    this.#container = options.container;
    this.#onResize = options.onResize;

    this.terminal = new Terminal({
      convertEol: false,
      cursorBlink: true,
      fontFamily:
        'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, "DejaVu Sans Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 2000,
      theme: readTheme(),
    });

    this.terminal.loadAddon(this.#fit);
    this.terminal.open(this.#container);
    this.terminal.onData(options.onData);

    // The flex layout has no measurable height until the first frame, and the
    // monospace metrics are not known until the font loads. Either one leaves
    // xterm at its 80x24 default, so retry until a real fit succeeds.
    this.#fitSoon(20);
    document.fonts?.ready.then(() => this.fit());

    this.#observer = new ResizeObserver(() => {
      if (this.#resizeTimer) clearTimeout(this.#resizeTimer);
      this.#resizeTimer = setTimeout(() => this.fit(), 120);
    });
    this.#observer.observe(this.#container);
  }

  #fitSoon(triesLeft: number): void {
    if (this.fit() || triesLeft <= 0) return;
    setTimeout(() => this.#fitSoon(triesLeft - 1), 100);
  }

  /** Returns false while the container is still too small to measure. */
  fit(): boolean {
    const box = this.#container.getBoundingClientRect();
    if (box.width < 50 || box.height < 50) return false;

    const proposed = this.#fit.proposeDimensions();
    if (!proposed?.cols || !proposed.rows) return false;

    this.#fit.fit();
    this.#scheduleSizePush();
    return true;
  }

  /** Mirror a settled size into the guest, once, rather than on every frame. */
  #scheduleSizePush(): void {
    const { cols, rows } = this.terminal;
    if (cols === this.#lastCols && rows === this.#lastRows) return;
    if (this.#settleTimer) clearTimeout(this.#settleTimer);
    this.#settleTimer = setTimeout(() => {
      this.#lastCols = this.terminal.cols;
      this.#lastRows = this.terminal.rows;
      this.#onResize(this.#lastCols, this.#lastRows);
    }, 500);
  }

  /** Force a size push even if the dimensions have not changed (after a restore). */
  pushSizeNow(): void {
    this.#lastCols = this.terminal.cols;
    this.#lastRows = this.terminal.rows;
    this.#onResize(this.#lastCols, this.#lastRows);
  }

  write(bytes: Uint8Array): void {
    this.terminal.write(bytes);
  }

  reset(): void {
    this.terminal.reset();
  }

  focus(): void {
    this.terminal.focus();
  }

  get size(): { cols: number; rows: number } {
    return { cols: this.terminal.cols, rows: this.terminal.rows };
  }

  dispose(): void {
    this.#observer?.disconnect();
    if (this.#resizeTimer) clearTimeout(this.#resizeTimer);
    if (this.#settleTimer) clearTimeout(this.#settleTimer);
    this.terminal.dispose();
  }
}

/**
 * The resize, run from the control channel.
 *
 * `/dev/ttyS0` is the tty the learner's shell and tmux client are on, so
 * setting its size from anywhere raises SIGWINCH there. That is the whole
 * reason this can be done off to the side: it never has to be typed where the
 * learner is working. No `clear` — the control shell's screen is not the one
 * being redrawn, and `refresh-client` is what makes tmux repaint.
 */
export function controlResizeCommand(cols: number, rows: number): string {
  return (
    `stty -F /dev/ttyS0 rows ${rows} cols ${cols} 2>/dev/null; ` +
    `tmux refresh-client 2>/dev/null; true`
  );
}
