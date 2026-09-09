/**
 * The chrome around a machine: the start gate, the status line under the
 * terminal, the boot progress bar and the editor overlay.
 *
 * Every screen that runs the guest paints these the same way — a lesson and the
 * playground differ in what they do with the machine, never in how the machine
 * reports itself. All of this used to live inside the learn screen's client, so
 * a second screen had the choice between duplicating the copy and drifting from
 * it. It is one module now, and the strings have one home.
 *
 * Nothing here knows what the machine is for. Grading, hints and completion
 * stay in the lesson's own client — the panel only ever asks it to start, which
 * it does on a gesture and, where it costs nothing, on its own.
 */
import { mayAutoStart, scheduleAutoStart } from './autostart';
import type { EditorOverlay } from './editor';
import type { MachineStatus, TmuxMachine } from './machine';

export type GateState = 'idle' | 'busy' | 'failed';

export interface GateCopy {
  title: string;
  body: string;
  note: string;
  action: string;
}

export interface PanelCopy {
  /** The paragraph shown when the machine did not start. */
  failed?: string;
}

/**
 * Only reached when a page ships a gate with nothing in it. The words a learner
 * actually reads are the ones in the markup: see #readIdleCopy.
 */
const IDLE_COPY: GateCopy = {
  title: 'A real terminal, in this tab',
  body: 'Real tmux, running in this tab. Nothing to install, and no server behind it.',
  note: 'about 15 MB, once',
  action: 'Start the terminal',
};

/**
 * Appended to the gate's note while a start is scheduled.
 *
 * Kept apart from the note itself rather than folded into it: #readIdleCopy
 * takes the idle copy from the markup, so writing a derived value back into
 * the element it is read from is how a suffix ends up on the page twice.
 */
const AUTO_START_NOTE = ' · starting on its own';

const FAILED_BODY =
  'Check your connection and try again. The lesson, the steps and the hints are all on this page either way.';

const DOT_COLOUR: Record<MachineStatus, string> = {
  idle: 'var(--color-ring)',
  loading: 'var(--color-hint)',
  booting: 'var(--color-hint)',
  ready: 'var(--color-accent)',
  failed: 'var(--color-alert)',
};

export class TerminalPanel {
  /** Where the terminal is opened. Null on a page with no machine on it. */
  readonly mount: HTMLElement | null;
  readonly startButton: HTMLButtonElement | null;
  readonly resetButton: HTMLButtonElement | null;

  #gate = document.querySelector<HTMLElement>('[data-terminal-gate]');
  #gateTitle = document.querySelector<HTMLElement>('[data-gate-title]');
  #gateBody = document.querySelector<HTMLElement>('[data-gate-body]');
  #gateNote = document.querySelector<HTMLElement>('[data-gate-note]');
  #progressBar = document.querySelector<HTMLElement>('[data-terminal-progress]');
  #statusPill = document.querySelector<HTMLElement>('[data-terminal-status]');
  #statusText = document.querySelector<HTMLElement>('[data-terminal-status-text]');
  #statusDot = document.querySelector<HTMLElement>('[data-terminal-dot]');
  #sizeLabel = document.querySelector<HTMLElement>('[data-terminal-size]');
  #sessionLabel = document.querySelector<HTMLElement>('[data-terminal-session]');
  #fullscreenHint = document.querySelector<HTMLElement>('[data-fullscreen-hint]');
  #fullscreenButton = document.querySelector<HTMLButtonElement>('[data-terminal-fullscreen]');
  #box = document.querySelector<HTMLElement>('[data-terminal-box]');

  #idle: GateCopy;
  #failedBody: string;
  #editor: EditorOverlay | null = null;
  #onFullscreenChange: ((on: boolean) => void) | null = null;
  #hintTimer: ReturnType<typeof setTimeout> | null = null;
  #cancelAutoStart: (() => void) | null = null;
  #autoStartArmed = false;

  constructor(copy: PanelCopy = {}) {
    this.mount = document.querySelector<HTMLElement>('[data-terminal-mount]');
    this.startButton = document.querySelector<HTMLButtonElement>('[data-terminal-start]');
    this.resetButton = document.querySelector<HTMLButtonElement>('[data-lesson-reset]');
    this.#idle = this.#readIdleCopy();
    this.#failedBody = copy.failed ?? FAILED_BODY;
  }

  /**
   * What the gate said before anything touched it.
   *
   * The busy and failed states are the machine talking, so their words live
   * here. The idle state is the page talking, and each page words it for
   * itself: a lesson invites you into a task, the playground into a terminal
   * with nothing attached to it. Reading it back means a page says that once,
   * in its own markup, and going back to idle restores exactly what a visitor
   * read before they pressed anything.
   */
  #readIdleCopy(): GateCopy {
    const read = (node: HTMLElement | null, fallback: string): string =>
      node?.textContent?.trim() || fallback;
    return {
      title: read(this.#gateTitle, IDLE_COPY.title),
      body: read(this.#gateBody, IDLE_COPY.body),
      note: read(this.#gateNote, IDLE_COPY.note),
      action: read(this.startButton, IDLE_COPY.action),
    };
  }

  /**
   * The gate is the machine's whole face until the machine has one.
   *
   * It used to be hidden the instant Start was clicked, which left the learner
   * watching an empty black rectangle for the length of a 15 MB download — and
   * left them watching it forever if the download failed, with no control on
   * screen to try again.
   */
  gate(state: GateState, detail = ''): void {
    const gate = this.#gate;
    if (!gate) return;
    gate.hidden = false;

    if (state === 'busy') {
      this.#writeGate({
        title: 'Starting the machine',
        body: detail || 'Fetching the emulator.',
        note: 'first time only — it is cached after this',
      });
      if (this.startButton) {
        this.startButton.disabled = true;
        this.startButton.textContent = 'Starting…';
      }
      return;
    }

    if (state === 'failed') {
      // The gate is the only one of the places this state shows that has room
      // to say anything useful, so it is the only one that says more than what
      // happened. The status line and the checklist get a label.
      this.#writeGate({
        title: 'The machine did not start',
        body: detail || this.#failedBody,
        note: 'nothing you did',
      });
      if (this.startButton) {
        this.startButton.disabled = false;
        this.startButton.textContent = 'Try again';
      }
      return;
    }

    this.#writeGate(this.#idle);
    // Said out loud, because a button about to press itself is otherwise a
    // small mystery. Here rather than only at the moment of arming, because a
    // screen paints its idle gate after wiring one up.
    if (this.#autoStartArmed && this.#gateNote) {
      this.#gateNote.textContent = `${this.#idle.note}${AUTO_START_NOTE}`;
    }
    if (this.startButton) {
      this.startButton.disabled = false;
      this.startButton.textContent = this.#idle.action;
    }
  }

  #writeGate(copy: { title: string; body: string; note: string }): void {
    if (this.#gateTitle) this.#gateTitle.textContent = copy.title;
    if (this.#gateBody) this.#gateBody.textContent = copy.body;
    if (this.#gateNote) this.#gateNote.textContent = copy.note;
  }

  /** The machine is up: the terminal underneath is the whole panel now. */
  hideGate(): void {
    if (this.#gate) this.#gate.hidden = true;
  }

  /**
   * Start the machine without being asked, at the first moment that costs
   * nothing: page loaded, terminal on screen, tab in front, main thread idle.
   *
   * The button does not move and does not stop working — this is a deadline a
   * visitor can always beat, not a replacement for the control. On a client
   * that declines (src/lib/vm/autostart.ts decides which) the button is the
   * only way in, exactly as before.
   */
  autoStart(start: () => void): void {
    const box = this.#box;
    const gate = this.#gate;
    if (!box || !gate) return;

    let cancelled = false;
    // Registered before the first await, not after it. Deciding whether a
    // client can afford the machine ends in a Cache API lookup, and a visitor
    // can press Start inside that: a cancel landing there has to be remembered
    // rather than arrive to find nothing registered yet. Missing it would put
    // "starting on its own" back under a gate that already says "Starting the
    // machine".
    this.#cancelAutoStart = () => {
      cancelled = true;
    };

    void (async () => {
      const may = await mayAutoStart();
      if (cancelled || !may || gate.hidden) return;

      this.#autoStartArmed = true;
      if (this.#gateNote) this.#gateNote.textContent = `${this.#idle.note}${AUTO_START_NOTE}`;

      const stop = scheduleAutoStart(box, () => {
        this.#cancelAutoStart = null;
        start();
      });
      this.#cancelAutoStart = () => {
        cancelled = true;
        stop();
      };
    })();
  }

  /**
   * Call off a pending auto-start.
   *
   * The screen's own start path calls this first: a visitor who pressed the
   * button has already asked for the machine, and a scheduled start arriving
   * afterwards would be a second boot request against one already on its way.
   */
  cancelAutoStart(): void {
    this.#cancelAutoStart?.();
    this.#cancelAutoStart = null;
    this.#autoStartArmed = false;
  }

  /**
   * The status line under the terminal. At rest it says the session and the
   * grid size and nothing else; it only speaks while the machine is doing
   * something or has stopped.
   */
  status(status: MachineStatus, detail: string): void {
    if (this.#statusPill) this.#statusPill.dataset.state = status;
    if (this.#statusDot) {
      this.#statusDot.style.background = DOT_COLOUR[status];
      this.#statusDot.hidden = status === 'idle' || status === 'ready';
    }
    // On `ready` the machine reports its own size, which the line already
    // carries a few characters to the left.
    if (this.#statusText) this.#statusText.textContent = status === 'ready' ? '' : detail;
  }

  progress(fraction: number): void {
    if (this.#progressBar) this.#progressBar.style.width = `${Math.round(fraction * 100)}%`;
  }

  /** The grid the guest is actually running at, written with its own separator
      so the line reads correctly before a size is known. */
  showSize(cols: number, rows: number): void {
    if (this.#sizeLabel) this.#sizeLabel.textContent = ` · ${cols}×${rows}`;
  }

  /**
   * Name the session the screen has just put the learner in.
   *
   * The markup ships whatever the page could promise before the machine ran —
   * "free play", where nothing is running yet — and this replaces it once
   * something is. Built as nodes rather than markup so the name keeps the
   * quieter colour the line is designed with.
   */
  showSession(name: string): void {
    const label = this.#sessionLabel;
    if (!label) return;
    const value = document.createElement('span');
    value.className = 'text-fg-dim';
    value.textContent = name;
    label.textContent = 'session ';
    label.append(value);
  }

  setResetEnabled(enabled: boolean): void {
    if (this.resetButton) this.resetButton.disabled = !enabled;
  }

  setFullscreenEnabled(enabled: boolean): void {
    if (this.#fullscreenButton) this.#fullscreenButton.disabled = !enabled;
  }

  /**
   * The full-screen toggle, if the page rendered one and the browser allows it.
   *
   * The whole terminal box goes into the top layer, gate and all, so the grid
   * the guest is given is the screen rather than a column of it. Nothing has to
   * resize it by hand: the box changing size is what the terminal's own
   * ResizeObserver is watching, and the new size reaches the guest the same way
   * a window resize does.
   *
   * The button lives on the status line, which is not in the top layer, so it
   * is out of reach while full screen is on — Escape is the way back, and every
   * browser says so on the way in.
   */
  initFullscreen(): void {
    const button = this.#fullscreenButton;
    const box = this.#box;
    // `fullscreenEnabled` is false on iOS Safari, and false in an iframe
    // without allowfullscreen. The control stays hidden rather than lying.
    if (!button || !box || !document.fullscreenEnabled) return;

    button.hidden = false;

    button.addEventListener('click', () => {
      if (document.fullscreenElement === box) {
        void document.exitFullscreen();
        return;
      }
      void box.requestFullscreen().catch((error: unknown) => {
        // Refusal is a browser policy decision, not a broken page: say so in
        // the console and leave the terminal exactly as it was.
        console.warn('full screen refused', error);
      });
    });

    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === box;
      button.textContent = on ? 'Exit full screen' : 'Full screen';
      button.setAttribute('aria-pressed', String(on));
      this.#showFullscreenHint(on);
      this.#onFullscreenChange?.(on);
    });
  }

  /**
   * Say how to get back out, then stop saying it.
   *
   * The toggle is on the status line, which full screen leaves behind on the
   * page, so Escape is the only way back and the box is the only thing left to
   * mention it. It shows for four seconds: long enough to read, short enough
   * that the terminal is what you are looking at.
   */
  #showFullscreenHint(on: boolean): void {
    const hint = this.#fullscreenHint;
    if (!hint) return;

    if (this.#hintTimer) clearTimeout(this.#hintTimer);
    if (!on) {
      hint.hidden = true;
      delete hint.dataset.shown;
      return;
    }

    hint.hidden = false;
    // A frame between `hidden` and the class that fades it in, or the browser
    // has nothing to transition from.
    requestAnimationFrame(() => {
      hint.dataset.shown = '';
    });
    this.#hintTimer = setTimeout(() => {
      delete hint.dataset.shown;
      // Matches the 300ms fade in the markup; hiding sooner cuts it off.
      this.#hintTimer = setTimeout(() => {
        hint.hidden = true;
      }, 300);
    }, 4000);
  }

  /** Called on the way in and out of full screen, once the toggle is wired. */
  onFullscreen(handler: (on: boolean) => void): void {
    this.#onFullscreenChange = handler;
  }

  /**
   * The overlay the guest's `open` command drives. CodeMirror is 200 KB and
   * only Level 4 ever opens a file, so it arrives the first time one is opened
   * and not before.
   */
  async openEditor(machine: TmuxMachine, path: string, contents: string): Promise<void> {
    const root = document.querySelector<HTMLElement>('[data-editor]');
    if (!root) return;

    if (!this.#editor) {
      const { EditorOverlay } = await import('./editor');
      this.#editor = new EditorOverlay({
        elements: {
          root,
          host: root.querySelector<HTMLElement>('[data-editor-host]')!,
          pathLabel: root.querySelector<HTMLElement>('[data-editor-path]')!,
          dirtyFlag: root.querySelector<HTMLElement>('[data-editor-dirty]')!,
          saveKeyLabel: root.querySelector<HTMLElement>('[data-editor-save-key]')!,
          saveButton: root.querySelector<HTMLElement>('[data-editor-save]')!,
          cancelButton: root.querySelector<HTMLElement>('[data-editor-cancel]')!,
        },
        send: (text) => machine.send(text),
        onClose: () => machine.view.focus(),
      });
    }

    this.#editor.show(path, contents);
  }

  /**
   * Close the editor without saving, if it is open.
   *
   * The overlay covers the terminal rather than the page, so Reset is reachable
   * while the guest is still blocked in `open`. Whatever is about to type into
   * that tty — a lesson's setup, the playground's own attach — has to have it
   * back first.
   */
  cancelEditor(): void {
    if (this.#editor?.isOpen) this.#editor.cancel();
  }
}
