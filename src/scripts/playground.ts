/**
 * The playground's client.
 *
 * The same machine as a lesson, with nothing on top of it: no spec, no setup,
 * no checks, no polling. Start the guest, hand the learner the keyboard, and
 * put the machine back when they ask.
 *
 * The gate, the status line and the editor overlay are the panel's, so this
 * screen cannot drift from the lesson screen's copy — see src/lib/vm/panel.ts.
 * Everything heavy is behind `import()` for the same reason it is there: the
 * emulator is 15 MB and an x86 CPU on the main thread, and the page is readable
 * and useful (it carries the whole key reference) before any of it loads.
 */
import '@xterm/xterm/css/xterm.css';

import { TerminalPanel } from '../lib/vm/panel';
import type { TmuxMachine } from '../lib/vm/machine';

/**
 * The session the playground opens for you, and the command that opens it.
 *
 * `-A` rather than plain `new`, so the same line works whether or not a session
 * called play is already there: it attaches to one if it exists and creates it
 * if it does not. That matters because this runs on every start and every
 * reset, and because the button offering it is still there after a detach.
 *
 * It is typed into the visible terminal, not run down the control channel. The
 * learner has to be able to see the command that put them inside tmux — the
 * whole confusion this course exists to clear up is not knowing whether you are
 * in a shell or in tmux, and a session that appeared by magic teaches that
 * confusion rather than curing it.
 */
const SESSION = 'play';
const ATTACH_COMMAND = `tmux new -A -s ${SESSION}`;

export function mountPlayground(): void {
  const panel = new TerminalPanel({
    // Only the failure paragraph differs from a lesson's: there is no task and
    // no hints here, so the consolation is the reference beside the terminal.
    failed:
      'Check your connection and try again. The key reference on this page does not need the machine.',
  });
  if (!panel.mount) return;

  /**
   * The buttons that type a command for you.
   *
   * They send into the visible terminal on purpose — this is the learner's own
   * shell, and a playground that ran commands behind their back would teach the
   * opposite of what the course is for. Every one of them is a line they could
   * have typed, and it lands in their history as if they had.
   *
   * They work before the machine does: pressing one starts the terminal and
   * holds the line until there is a prompt to type it into. A control that
   * cannot fail is better than one greyed out for the length of a boot.
   */
  const senders = [...document.querySelectorAll<HTMLButtonElement>('[data-send]')];

  /** A command pressed before the machine was ready. Only the last one waits. */
  let queued: string | null = null;

  let machine: TmuxMachine | null = null;
  let loading: Promise<TmuxMachine> | null = null;
  let started = false;

  async function loadMachine(): Promise<TmuxMachine> {
    const { TmuxMachine } = await import('../lib/vm/machine');

    const next = new TmuxMachine({
      container: panel.mount!,
      events: {
        status: (status, detail) => {
          panel.status(status, detail);
          if (status === 'loading' || status === 'booting') panel.gate('busy', detail);
          if (status === 'ready') {
            panel.hideGate();
            const { cols, rows } = next.view.size;
            panel.showSize(cols, rows);
            panel.setResetEnabled(true);
            panel.setFullscreenEnabled(true);
          }
        },
        progress: (fraction) => panel.progress(fraction),
        // The grid changes on a window resize and, most visibly, on the way in
        // and out of full screen.
        resize: (cols, rows) => panel.showSize(cols, rows),
        openFile: (path, contents) => void panel.openEditor(next, path, contents),
      },
    });

    machine = next;

    // A handle for debugging a live session from the console, the same one the
    // lesson screen installs.
    (window as unknown as Record<string, unknown>).__learntmux = {
      machine: next,
      send: (text: string) => next.send(text),
    };

    return next;
  }

  /**
   * Put the learner inside tmux.
   *
   * A beat first, so the line is not typed into a terminal that is still
   * redrawing itself after a boot or a restore — the same pause the lesson
   * runner takes before its own start command.
   */
  async function enterTmux(live: TmuxMachine): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    live.send(`${ATTACH_COMMAND}\n`);
    panel.showSession(SESSION);

    // Whatever was pressed while the machine was still coming up. It waits for
    // tmux rather than racing it, so the line lands in the session and not in
    // the shell underneath it.
    if (queued) {
      const command = queued;
      queued = null;
      await new Promise((resolve) => setTimeout(resolve, 600));
      live.send(`${command}\n`);
    }
  }

  async function start(): Promise<void> {
    if (started) return;
    started = true;

    panel.gate('busy', 'Fetching the emulator.');
    panel.status('loading', 'loading the emulator');

    try {
      loading ??= loadMachine();
      const ready = await loading;
      await ready.boot();
      // What Reset restores: the plain shell prompt, before tmux. The session
      // is re-made on top of it after every restore, so the baseline stays the
      // one thing a reset can always get back to.
      await ready.captureBaseline();
      await enterTmux(ready);
      ready.view.focus();
    } catch (error) {
      console.error('could not start the terminal', error);
      loading = null;
      machine = null;
      panel.status('failed', 'machine stopped');
      panel.gate('failed');
      started = false;
    }
  }

  panel.startButton?.addEventListener('click', () => void start());

  /**
   * Put the machine back exactly as it booted, then walk back into tmux: an
   * empty session called play, nothing else running, nothing in the history.
   *
   * This is a restore, not a reboot — the snapshot is already in memory, so
   * nothing is downloaded. The steps after it mirror what the machine itself
   * does when it wakes from a snapshot: the control channel has to answer again
   * before the size can be pushed, and the screen is blank until something asks
   * the shell to repaint.
   */
  async function reset(): Promise<void> {
    const live = machine;
    if (!live || !live.hasBaseline) return;

    // The editor covers the terminal, so Reset is reachable while the guest is
    // still blocked in `open`. Hand the tty back before anything types into it.
    panel.cancelEditor();
    panel.setResetEnabled(false);
    panel.status('booting', 'resetting the machine');

    try {
      await live.restoreBaseline();
      await live.control.waitUntilReady();
      live.applySize();
      // Ctrl-L, so the restored prompt is drawn into a terminal that was reset.
      // A keystroke, not a command: it leaves no trace in the shell's history.
      live.send('\x0c');
      // Back where the page started you: a fresh session called play, with
      // nothing in it.
      await enterTmux(live);
      const { cols, rows } = live.view.size;
      panel.status('ready', `Alpine i386 + tmux · ${cols}×${rows}`);
      panel.showSize(cols, rows);
      live.view.focus();
    } catch (error) {
      console.error('reset failed', error);
      panel.status('failed', 'reset failed');
    } finally {
      panel.setResetEnabled(true);
    }
  }

  panel.resetButton?.addEventListener('click', () => void reset());

  senders.forEach((button) => {
    button.addEventListener('click', () => {
      const command = button.dataset.send;
      if (!command) return;

      if (!machine?.isBooted) {
        queued = command;
        void start();
        return;
      }

      machine.send(`${command}\n`);
      machine.view.focus();
    });
  });

  // Full screen is the playground's alone: there is no task column here to be
  // hidden behind the terminal. The toggle stays hidden if the browser will not
  // allow it, so it is wired before anything else touches it.
  panel.initFullscreen();
  panel.onFullscreen(() => machine?.view.focus());

  panel.gate('idle');
}
