/**
 * The chrome around a machine: the loading screen, the status line under the
 * terminal and the editor overlay.
 *
 * Every screen that runs the guest paints these the same way — a lesson and the
 * playground differ in what they do with the machine, never in how the machine
 * reports itself. All of this used to live inside the learn screen's client, so
 * a second screen had the choice between duplicating the copy and drifting from
 * it. It is one module now, and the strings have one home.
 *
 * Nothing here knows what the machine is for. Grading, hints and completion
 * stay in the lesson's own client — the panel only ever asks it to start, which
 * it does on its own wherever the client can afford it, and on a press where it
 * had to ask first or where something went wrong.
 */
import { autoStartVerdict, scheduleAutoStart, type AutoStartVerdict } from './autostart';
import type { EditorOverlay } from './editor';
import type { MachineStatus, TmuxMachine } from './machine';

export type GateState =
  /** Nothing has happened yet, and a start is coming. */
  | 'idle'
  /** Downloading or booting. */
  | 'busy'
  /**
   * Up, but not yet the learner's: the screen underneath is being laid out.
   * The mark is finished — the machine has arrived — and holds while that
   * happens. A lesson passes through here; the playground never does.
   */
  | 'staging'
  /** Up. Held for one beat at full strength, then gone. */
  | 'ready'
  /** A client that declines the download, one press from having it. */
  | 'held'
  /** It started and stopped. */
  | 'failed'
  /** This browser cannot run the machine at all. */
  | 'unsupported';

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
 * Only reached when a page ships a loading screen with nothing in it. The words
 * a learner actually reads are the ones in the markup: see #readIdleCopy.
 */
const IDLE_COPY: GateCopy = {
  title: 'A real terminal, in this tab',
  body: 'Real tmux, running in this tab. Nothing to install, and no server behind it.',
  note: 'about 15 MB, once',
  action: 'Start the terminal',
};

const FAILED_BODY =
  'Check your connection and try again. The lesson, the steps and the hints are all on this page either way.';

/**
 * Why the machine is waiting to be asked, said to the person waiting.
 *
 * There is no button on the automatic path any more, so a client that declines
 * cannot simply be handed one and left to work out why the terminal did not
 * appear on its own. Each of these is the reason plus the price, because those
 * are the two things someone needs to decide.
 */
const HELD_NOTE: Record<Exclude<AutoStartVerdict, 'go'>, string> = {
  'save-data': 'data saver is on — this is about 15 MB',
  'small-screen': 'about 15 MB, and it runs here on your phone',
  'weak-device': 'about 15 MB, and it is heavy on this device',
  'slow-link': 'about 15 MB, on a connection that looks slow',
  automated: 'about 15 MB, once',
};

/**
 * How much of the mark each pane is worth.
 *
 * The panes are the progress bar, so their shares have to be their areas: the
 * tall one is half the logo and carries the first half of the download. Any
 * other split would have the shape finishing before the bytes did.
 */
const PANE_SHARE = [0.5, 0.25, 0.25];

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
  #paneFills = [...document.querySelectorAll<HTMLElement>('[data-gate-logo] .learn-gate-pane > i')];
  #statusPill = document.querySelector<HTMLElement>('[data-terminal-status]');
  #statusText = document.querySelector<HTMLElement>('[data-terminal-status-text]');
  #statusDot = document.querySelector<HTMLElement>('[data-terminal-dot]');
  #sizeLabel = document.querySelector<HTMLElement>('[data-terminal-size]');
  #sessionLabel = document.querySelector<HTMLElement>('[data-terminal-session]');
  #fullscreenHint = document.querySelector<HTMLElement>('[data-fullscreen-hint]');
  #focusChip = document.querySelector<HTMLElement>('[data-terminal-focus]');
  #focusText = document.querySelector<HTMLElement>('[data-terminal-focus-text]');
  #nudge = document.querySelector<HTMLElement>('[data-terminal-nudge]');
  #nudgeKey = document.querySelector<HTMLElement>('[data-nudge-key]');
  #fullscreenButton = document.querySelector<HTMLButtonElement>('[data-terminal-fullscreen]');
  #box = document.querySelector<HTMLElement>('[data-terminal-box]');

  #idle: GateCopy;
  #failedBody: string;
  #editor: EditorOverlay | null = null;
  #onFullscreenChange: ((on: boolean) => void) | null = null;
  #hintTimer: ReturnType<typeof setTimeout> | null = null;
  #cancelAutoStart: (() => void) | null = null;
  #focusArmed = false;
  #nudgeTimer: ReturnType<typeof setTimeout> | null = null;
  #nudgeAt = 0;
  #nudged = false;
  #requestFocus: (() => void) | null = null;
  #gateState: GateState = 'idle';
  #progress = 0;
  #leaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Held so a connection coming back can start the machine without a press. */
  #start: (() => void) | null = null;
  #waitingForNetwork = false;

  constructor(copy: PanelCopy = {}) {
    this.mount = document.querySelector<HTMLElement>('[data-terminal-mount]');
    this.startButton = document.querySelector<HTMLButtonElement>('[data-terminal-start]');
    this.resetButton = document.querySelector<HTMLButtonElement>('[data-lesson-reset]');
    this.#idle = this.#readIdleCopy();
    this.#failedBody = copy.failed ?? FAILED_BODY;
  }

  /**
   * What the loading screen said before anything touched it.
   *
   * Every state but this one is the machine talking, so their words live here.
   * This one is the page talking, and each page words it for itself: a lesson
   * invites you into a task, the playground into a terminal with nothing
   * attached to it. Reading it back means a page says that once, in its own
   * markup, and a client that has to be asked is asked in the page's own voice.
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
   * The loading screen is the machine's whole face until the machine has one.
   *
   * It used to be hidden the instant Start was clicked, which left the learner
   * watching an empty black rectangle for the length of a 15 MB download — and
   * left them watching it forever if the download failed, with no control on
   * screen to try again.
   *
   * There is no button in the ordinary path now: the machine starts itself, so
   * the screen only ever has to say what is happening. The button comes back
   * for the two states that are a question — a client that declines the
   * download, and a machine that stopped.
   *
   * Nor does the screen leave the moment the machine reaches a prompt. That
   * prompt is not always the terminal the learner was promised: a lesson has
   * still to reset it, run its setup and type `tmux attach` into it, and a
   * screen that had already gone showed every one of those. So the panel never
   * decides for itself that the machine is up — the screen running it says so,
   * through `hideGate`, and holds `staging` until then.
   */
  gate(state: GateState, detail = ''): void {
    const gate = this.#gate;
    if (!gate) return;

    if (this.#leaveTimer) clearTimeout(this.#leaveTimer);
    this.#leaveTimer = null;
    gate.hidden = false;
    delete gate.dataset.leaving;
    gate.dataset.state = state;
    this.#gateState = state;
    // Anything that is not the download is not a percentage: a failed start and
    // a held one both keep whatever had arrived, and only `busy` counts up.
    if (state === 'idle' || state === 'held') this.#paint(0);

    if (state === 'busy') {
      this.#writeGate({
        title: this.#loadingMessage(detail),
        note: this.#progressNote(),
        dots: true,
      });
      this.#showAction(null);
      return;
    }

    if (state === 'staging') {
      // The machine has arrived, so the shape is finished: whatever the
      // download had painted fills the rest of the way and holds there while
      // the terminal underneath is laid out. The glow and the dots are what
      // say time is still passing. The note is the one thing this state knows
      // for certain, and it is the thing worth knowing — the wait left is not
      // the 15 MB kind.
      this.#paint(1);
      this.#writeGate({
        title: this.#loadingMessage(detail || 'Almost there'),
        note: 'the machine is up',
        dots: true,
      });
      this.#showAction(null);
      return;
    }

    if (state === 'failed') {
      // The one place this state shows that has room to say anything useful, so
      // the only one that says more than what happened. The status line and the
      // checklist get a label.
      //
      // Offline is worth telling apart: nothing here is broken, the retry will
      // fail the same way until the connection is back, and this is the only
      // failure the page can watch for and recover from by itself.
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      this.#writeGate(
        offline
          ? {
              title: 'You are offline',
              body:
                'The machine is one download away and needs a connection for it. ' +
                'It starts on its own as soon as you are back.',
              note: 'waiting for the network',
            }
          : {
              title: 'The machine did not start',
              body: detail || this.#failedBody,
              note: 'nothing you did',
            },
      );
      this.#showAction('Try again');
      if (offline) this.#retryWhenOnline();
      return;
    }

    if (state === 'unsupported') {
      this.#writeGate({
        title: 'This browser cannot run the machine',
        body:
          detail ||
          'It needs WebAssembly, which this browser has turned off or does not have. ' +
            'Everything else on the page works without it.',
        note: 'nothing you did',
      });
      this.#showAction(null);
      return;
    }

    if (state === 'held') {
      // Asked rather than started, and told why in the same breath: with no
      // button in the ordinary path, "press this" with no reason attached would
      // read as the page having simply failed to do its job.
      this.#writeGate({
        title: this.#idle.title,
        body: this.#idle.body,
        note: detail || this.#idle.note,
      });
      this.#showAction(this.#idle.action);
      return;
    }

    if (state === 'ready') {
      // One beat of the finished mark, then out of the way. #leave does the
      // leaving; this only has to stop the screen taking clicks meant for the
      // terminal that is already painted underneath it.
      this.#writeGate({ title: 'Ready', note: '' });
      this.#showAction(null);
      return;
    }

    // Idle: the machine is coming and nothing has been asked of anyone.
    this.#writeGate({ title: 'Starting the terminal', note: this.#idle.note, dots: true });
    this.#showAction(null);
  }

  /**
   * The machine's own words, made into a line to read.
   *
   * The statuses are written for the one-line readout under the terminal, in
   * lower case and sometimes with a full stop from whichever screen sent them.
   * This is the same sentence given a capital and no stop — the dots after it
   * are the screen's own — because it is a heading here rather than a fragment
   * in a status line.
   */
  #loadingMessage(detail: string): string {
    const text = detail.trim().replace(/[.…]+$/, '');
    if (!text) return 'Starting the machine';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** What the note says while bytes are moving. */
  #progressNote(): string {
    if (this.#progress <= 0) return 'first time only — it is cached after this';
    return `${Math.round(this.#progress * 100)}% of about 15 MB`;
  }

  #writeGate(copy: { title: string; body?: string; note: string; dots?: boolean }): void {
    if (this.#gateTitle) {
      this.#gateTitle.textContent = copy.title;
      // Three dots, and only while something is genuinely in flight: this is
      // the part of the screen a person checks to decide whether the page is
      // still alive, so it must never animate over a machine that has stopped.
      if (copy.dots) this.#gateTitle.append(this.#dots());
    }
    if (this.#gateBody) {
      // The automatic path is a mark and a line. The paragraph is for the
      // states that owe an explanation.
      this.#gateBody.hidden = !copy.body;
      if (copy.body) this.#gateBody.textContent = copy.body;
    }
    if (this.#gateNote) {
      this.#gateNote.textContent = copy.note;
      this.#gateNote.hidden = !copy.note;
    }
  }

  #dots(): HTMLElement {
    const dots = document.createElement('span');
    dots.className = 'learn-gate-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.append(
      document.createElement('i'),
      document.createElement('i'),
      document.createElement('i'),
    );
    return dots;
  }

  /** The button, which only some states have. */
  #showAction(label: string | null): void {
    const button = this.startButton;
    if (!button) return;
    button.hidden = label === null;
    button.disabled = false;
    if (label) button.textContent = label;
  }

  /**
   * A failed start that was only ever the network, retried the moment there is
   * one again.
   *
   * The alternative is a screen that says "try again" to someone whose train
   * has just gone into a tunnel, and stays that way after it comes out.
   */
  #retryWhenOnline(): void {
    if (this.#waitingForNetwork || typeof window === 'undefined') return;
    this.#waitingForNetwork = true;
    window.addEventListener(
      'online',
      () => {
        this.#waitingForNetwork = false;
        // Only if nothing else has happened in the meantime — a press on Try
        // again is already a start, and this must not become a second one.
        if (this.#gateState !== 'failed') return;
        this.#start?.();
      },
      { once: true },
    );
  }

  /**
   * The terminal underneath is the learner's now, and the whole panel.
   *
   * It does not simply vanish. The mark finishes, holds for a beat at full
   * strength, and fades — the terminal was already painted behind it, so what a
   * learner sees is the thing they were waiting for being uncovered rather than
   * a loading screen being swapped out for it.
   */
  hideGate(): void {
    const gate = this.#gate;
    this.#armFocus();
    if (!gate || gate.hidden) return;

    this.#paint(1);
    this.gate('ready');

    if (this.#leaveTimer) clearTimeout(this.#leaveTimer);
    this.#leaveTimer = setTimeout(() => {
      gate.dataset.leaving = '';
      // Matches the fade in global.css; hiding sooner cuts it off.
      this.#leaveTimer = setTimeout(() => {
        gate.hidden = true;
        delete gate.dataset.leaving;
      }, 260);
    }, 240);
  }

  /**
   * How to put the keyboard back in the terminal, for the parts of the box that
   * are not the terminal.
   *
   * xterm focuses itself when you click its own node, but the box is 12px
   * wider than that on every side, and the pill this panel raises says "click
   * the terminal" — which has to be true of the whole rectangle it is pointing
   * at, not just the character grid inside it.
   */
  onRequestFocus(focus: () => void): void {
    this.#requestFocus = focus;
  }

  /**
   * Say whether the keys are landing in the terminal.
   *
   * Armed here rather than at construction: until the machine is running the
   * gate covers the box, the button is what to click, and a box announcing
   * that it does not have focus is answering a question nobody asked. The
   * paint is all in global.css; this only ever moves two attributes.
   */
  #armFocus(): void {
    const box = this.#box;
    const mount = this.mount;
    if (this.#focusArmed || !box || !mount) return;
    this.#focusArmed = true;

    if (this.#focusChip) this.#focusChip.hidden = false;

    const set = (on: boolean): void => {
      box.dataset.focus = on ? 'on' : 'off';
      if (this.#focusChip) this.#focusChip.dataset.state = on ? 'on' : 'off';
      if (this.#focusText) this.#focusText.textContent = on ? 'keys go here' : 'click to type';
      // They clicked in. Whatever the pill was still saying is answered.
      if (on) this.#hideNudge();
    };

    set(mount.contains(document.activeElement));

    mount.addEventListener('focusin', () => set(true));
    mount.addEventListener('focusout', (event) => {
      // xterm moves focus between its own nodes as it renders. Focus has only
      // left the terminal when it lands outside the mount.
      const next = (event as FocusEvent).relatedTarget;
      if (next instanceof Node && mount.contains(next)) return;
      set(false);
    });

    // The padding around the grid is part of the box the pill points at.
    box.addEventListener('pointerdown', (event) => {
      if (this.#gate && !this.#gate.hidden) return;
      const target = event.target;
      if (target instanceof Node && mount.contains(target)) return;
      // Buttons and the editor overlay live in here too; they keep their click.
      if (target instanceof Element && target.closest('button, input, textarea, a')) return;
      this.#requestFocus?.();
    });

    document.addEventListener('keydown', this.#onStrayKey, true);
  }

  #disarmFocus(): void {
    if (!this.#focusArmed) return;
    this.#focusArmed = false;
    document.removeEventListener('keydown', this.#onStrayKey, true);
    this.#hideNudge();
    if (this.#box) delete this.#box.dataset.focus;
    if (this.#focusChip) this.#focusChip.hidden = true;
  }

  /**
   * A key that was meant for the shell and reached the page instead.
   *
   * The bar is deliberately narrow: the prefix, or a single printable
   * character typed at nothing in particular. Anything with a modifier the
   * browser owns, and anything typed into a control that takes typing, arrived
   * where it was aimed and is none of this panel's business.
   */
  #onStrayKey = (event: KeyboardEvent): void => {
    if (!this.#focusArmed || this.#box?.dataset.focus === 'on') return;
    if (event.defaultPrevented || event.metaKey || event.altKey) return;

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input, textarea, select, button, a, summary, [contenteditable]')
    ) {
      return;
    }

    const key = event.key;
    const prefix = event.ctrlKey && key.toLowerCase() === 'b';
    // Space scrolls the page, and someone reading the steps is entitled to it.
    const bare = !event.ctrlKey && key.length === 1 && key !== ' ';
    if (!prefix && !bare) return;

    this.#showNudge(prefix ? 'C-b' : key);
  };

  /**
   * Where that key went.
   *
   * The same pill and the same fade as the full-screen hint — the box has one
   * way of speaking for itself and this is it. The box only flashes for the
   * first one: after that the learner knows what the pill means, and a
   * rectangle pulsing at every stray keystroke is its own kind of noise.
   */
  #showNudge(key: string): void {
    const pill = this.#nudge;
    const box = this.#box;
    if (!pill || !box) return;

    const now = Date.now();
    if (now - this.#nudgeAt < 4000) return;
    this.#nudgeAt = now;

    if (this.#nudgeKey) this.#nudgeKey.textContent = key;
    if (this.#nudgeTimer) clearTimeout(this.#nudgeTimer);

    if (!this.#nudged) {
      this.#nudged = true;
      box.dataset.nudge = '';
      // Two 420ms pulses, and a little after them: the attribute also carries
      // the held amber edge that replaces them under reduced motion.
      setTimeout(() => delete box.dataset.nudge, 900);
    }

    pill.hidden = false;
    // The browser needs a start value to transition from, so style and layout
    // are flushed between `hidden` and the attribute that fades it in. Reading
    // a layout property does that on this line; the same thing waited on
    // `requestAnimationFrame` until a tab that had stopped rendering — a
    // backgrounded one — left the pill un-faded at opacity 0 and then hid it
    // again, which is the whole message lost in the one case where the machine
    // has been sitting unattended.
    void pill.offsetHeight;
    pill.dataset.shown = '';
    this.#nudgeTimer = setTimeout(() => {
      delete pill.dataset.shown;
      // Matches the 300ms fade in the markup; hiding sooner cuts it off.
      this.#nudgeTimer = setTimeout(() => {
        pill.hidden = true;
      }, 300);
    }, 2600);
  }

  #hideNudge(): void {
    const pill = this.#nudge;
    if (this.#nudgeTimer) clearTimeout(this.#nudgeTimer);
    this.#nudgeTimer = null;
    if (this.#box) delete this.#box.dataset.nudge;
    if (!pill) return;
    delete pill.dataset.shown;
    this.#nudgeTimer = setTimeout(() => {
      pill.hidden = true;
    }, 300);
  }

  /**
   * Start the machine without being asked, at the first moment that costs
   * nothing: page loaded, terminal on screen, tab in front, main thread idle.
   *
   * This is the ordinary path and it has no button in it. What it has instead
   * is a loading screen that says what is happening, because a terminal that
   * takes fifteen megabytes to appear has to account for itself either way.
   *
   * Two things can stop it. A browser with no WebAssembly cannot run the guest
   * at all and is told so once, plainly. A client that declines the download —
   * data saver, a phone, a slow link, decided in src/lib/vm/autostart.ts — is
   * asked, with the reason and the price on the same screen.
   */
  autoStart(start: () => void): void {
    const box = this.#box;
    const gate = this.#gate;
    this.#start = start;
    if (!box || !gate) return;

    // Nothing below this matters without it: v86 is WebAssembly, and every
    // other path ends at a download that cannot be run.
    if (typeof WebAssembly === 'undefined') {
      this.gate('unsupported');
      return;
    }

    let cancelled = false;
    // Registered before the first await, not after it. Deciding whether a
    // client can afford the machine ends in a Cache API lookup, and a screen
    // can start the machine inside that: a cancel landing there has to be
    // remembered rather than arrive to find nothing registered yet.
    this.#cancelAutoStart = () => {
      cancelled = true;
    };

    void (async () => {
      const verdict = await autoStartVerdict();
      if (cancelled || gate.hidden) return;

      if (verdict !== 'go') {
        this.gate('held', HELD_NOTE[verdict]);
        return;
      }

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
  }

  /**
   * The status line under the terminal. At rest it says the session and the
   * grid size and nothing else; it only speaks while the machine is doing
   * something or has stopped.
   */
  status(status: MachineStatus, detail: string): void {
    // Nothing is listening for keys any more, and the gate is back over the
    // box: "click to type" beside "machine stopped" is two dots and a lie.
    if (status === 'failed') this.#disarmFocus();
    if (this.#statusPill) this.#statusPill.dataset.state = status;
    if (this.#statusDot) {
      this.#statusDot.style.background = DOT_COLOUR[status];
      this.#statusDot.hidden = status === 'idle' || status === 'ready';
    }
    // On `ready` the machine reports its own size, which the line already
    // carries a few characters to the left.
    if (this.#statusText) this.#statusText.textContent = status === 'ready' ? '' : detail;
  }

  /**
   * How much of the machine has arrived, drawn into the logo.
   *
   * The mark is the progress bar — see PANE_SHARE — so there is no second
   * readout anywhere saying the same thing in a straight line, and the shape
   * completing is the machine arriving.
   */
  progress(fraction: number): void {
    this.#progress = Math.min(1, Math.max(0, fraction));
    // Once the machine has arrived the mark is finished and stays that way:
    // nothing landing late gets to empty a shape the screen is holding at full
    // strength, or already fading out.
    if (this.#gateState === 'staging' || this.#gateState === 'ready') return;
    this.#paint(this.#progress);
    // The note carries the number for anyone who wants one, and only while
    // there is a download to put a number on.
    if (this.#gateState === 'busy' && this.#gateNote) {
      this.#gateNote.textContent = this.#progressNote();
    }
  }

  /** Fill each pane with its own share of `fraction`. */
  #paint(fraction: number): void {
    let filled = 0;
    this.#paneFills.forEach((fill, index) => {
      const share = PANE_SHARE[index] ?? 0;
      const within = share === 0 ? 0 : (fraction - filled) / share;
      fill.style.setProperty('--p', String(Math.min(1, Math.max(0, within))));
      filled += share;
    });
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
