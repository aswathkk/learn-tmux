/**
 * The learn screen's client.
 *
 * Its job is to connect three things that already exist: the lesson spec baked
 * into the page, the machine in src/lib/vm, and the markup rendered by the
 * lesson page. It renders nothing from scratch — every row, hint and panel is
 * already in the HTML, and this only toggles state on them.
 *
 * Nothing here loads the emulator during page load. That is the whole reason
 * the machine is held back at all: 15 MB and an x86 CPU on the main thread is
 * not something to spend on someone who came to read. It used to be only half
 * true. The v86 image was held back, but xterm.js, the machine and the
 * CodeMirror overlay were static imports, so every lesson page pulled 634 KB —
 * 176 KB over the wire — before anything was asked for, on a page whose entire
 * premise is that it is readable before any JavaScript runs. They are behind
 * `import()` now: what loads eagerly is this file, and this file is the hints,
 * the navigator, the progress count and the completion swap.
 *
 * It is not a wall, though, and there is no button in front of it. Once the
 * page has loaded, gone idle and put the terminal on screen, the machine starts
 * itself behind a loading screen that says so — every metric it could have hurt
 * is already recorded by then, and a learner who opened a lesson wanted the
 * terminal. src/lib/vm/autostart.ts decides which clients can afford that; the
 * rest are asked, on the same screen. The screen stays up past the boot: the
 * prompt the machine wakes at is reset, set up and typed into before it is
 * the lesson's, and it is uncovered only once it is.
 *
 * The stylesheet stays eager. It is 4 KB, it has no JavaScript cost, and moving
 * it into the deferred chunk would land it after global.css and undo the
 * `.xterm.terminal` overrides there.
 */
import '@xterm/xterm/css/xterm.css';

import { TerminalPanel } from '../lib/vm/panel';
import type { TmuxMachine } from '../lib/vm/machine';
import type { LessonRunner, RunnerPhase } from '../lib/harness/runner';
import type { ChecklistState } from '../lib/harness/checks';
import type { Check } from '../lib/harness/types';
import { stepStates } from '../lib/lesson-steps';
import { markComplete, readProgress, recordHintUsed } from '../lib/progress';

interface PageSpec {
  id: string;
  slug: string;
  setup: string[];
  startCommand?: string;
  checks: Check[];
  hintCount: number;
}

function formatElapsed(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Honoured for scrolling too: `behavior: 'smooth'` overrides the CSS reset. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function mountLearnScreen(): void {
  const specNode = document.querySelector<HTMLScriptElement>('[data-lesson-spec]');
  // The gate, the status line and the editor overlay are the same on every
  // screen with a machine on it; they live in src/lib/vm/panel.ts.
  const panel = new TerminalPanel();
  if (!specNode || !panel.mount) return;

  const spec = JSON.parse(specNode.textContent ?? '{}') as PageSpec;

  const checklist = document.querySelector<HTMLElement>('[data-checklist]');
  const checksStatus = document.querySelector<HTMLElement>('[data-checks-status-text]');
  const checksDot = document.querySelector<HTMLElement>('[data-checks-dot]');
  const stepRows = [...document.querySelectorAll<HTMLElement>('[data-step-index]')];
  const working = [...document.querySelectorAll<HTMLElement>('[data-working]')];
  const completion = document.querySelector<HTMLElement>('[data-completion]');
  const completionTime = document.querySelector<HTMLElement>('[data-completion-time]');
  const completionHints = document.querySelector<HTMLElement>('[data-completion-hints]');

  let startedAt = 0;
  let hintsRevealed = 0;

  // --------------------------------------------------------------- checklist

  function setChecksStatus(text: string, colour: string): void {
    if (checksStatus) checksStatus.textContent = text;
    if (checksDot) checksDot.style.background = colour;
  }

  /** What each row's state sounds like. The paint alone reaches nobody. */
  const CHECK_STATE_LABEL = {
    done: '— done',
    current: '— next',
    todo: '— not done yet',
  } as const;

  function renderChecklist(state: ChecklistState): void {
    if (checklist) {
      const rows = checklist.querySelectorAll<HTMLElement>('[data-check-index]');
      // Exactly one row is "current": the first one still outstanding. It is
      // what tells the learner where to look next.
      let currentMarked = false;
      rows.forEach((row) => {
        const index = Number(row.dataset.checkIndex);
        let next: keyof typeof CHECK_STATE_LABEL;
        if (state.done.has(index)) {
          next = 'done';
        } else if (!currentMarked) {
          next = 'current';
          currentMarked = true;
        } else {
          next = 'todo';
        }
        row.dataset.state = next;
        const label = row.querySelector<HTMLElement>('[data-check-state]');
        if (label) label.textContent = CHECK_STATE_LABEL[next];
      });
    }

    // Steps are shaded from the same progress. They are not formally tied to
    // individual checks, so this only ever shades the list — the checks panel
    // is the authoritative record of what is done.
    const states = stepStates(stepRows.length, state.done.size, spec.checks.length);
    stepRows.forEach((row, index) => {
      const next = states[index] ?? 'todo';
      row.dataset.state = next;
      // The green ring is the only mark on the step being worked; this is the
      // same fact for anyone who cannot see it.
      if (next === 'current') row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });

    if (spec.checks.length) {
      const remaining = spec.checks.length - state.done.size;
      setChecksStatus(
        remaining === 0 ? 'all passed' : `${state.done.size} of ${spec.checks.length}`,
        'var(--color-accent)',
      );
    }
  }

  // ----------------------------------------------------------------- machine

  let machine: TmuxMachine | null = null;
  let runner: LessonRunner | null = null;
  let loading: Promise<LessonRunner> | null = null;

  /**
   * Everything below this line is downloaded on the gesture, not on load: the
   * emulator wiring, xterm, and — only when the guest actually asks to edit a
   * file, which is Level 4 and nowhere else — CodeMirror.
   */
  async function loadRunner(): Promise<LessonRunner> {
    const [{ TmuxMachine }, { LessonRunner }] = await Promise.all([
      import('../lib/vm/machine'),
      import('../lib/harness/runner'),
    ]);

    machine = new TmuxMachine({
      container: panel.mount!,
      events: {
        status: (status, detail) => {
          panel.status(status, detail);
          if (status === 'loading' || status === 'booting') panel.gate('busy', detail);
          // Ready is a prompt, not a lesson. The runner is about to reset that
          // prompt, stage the task on it and type `tmux attach` into it, and a
          // loading screen that left here showed all three — a blank box, then
          // the command, then tmux over the top of it. It leaves on `watching`.
          if (status === 'ready') {
            if (machine) {
              const { cols, rows } = machine.view.size;
              panel.showSize(cols, rows);
            }
            panel.setResetEnabled(true);
          }
        },
        progress: (fraction) => panel.progress(fraction),
        // The status line's size is written at boot; without this it would go
        // on claiming that grid after the window changed shape.
        resize: (cols, rows) => panel.showSize(cols, rows),
        openFile: (path, contents) => {
          if (machine) void panel.openEditor(machine, path, contents);
        },
      },
    });

    // The box is wider than the character grid, so a click on its padding has
    // to reach the terminal too — see TerminalPanel#armFocus.
    const live = machine;
    panel.onRequestFocus(() => live.view.focus());

    runner = new LessonRunner(machine, {
      phase: (phase: RunnerPhase, detail: string) => {
        if (phase === 'error') {
          panel.status('failed', 'machine stopped');
          setChecksStatus('not running', 'var(--color-alert)');
          // The gate writes its own copy: `detail` is a one-line summary sized
          // for a status line, and the gate has a paragraph to fill.
          panel.gate('failed');
          started = false;
        } else if (phase === 'watching') {
          // Only now is the terminal the learner's: the task is staged and
          // tmux has had its beat to draw. This is where the screen leaves.
          panel.hideGate();
          setChecksStatus('watching your terminal', 'var(--color-accent)');
        } else if (phase === 'resetting' || phase === 'staging' || phase === 'starting') {
          // On the way in, and again on Reset. The machine is up, so the mark
          // is finished; the screen stays over a terminal that is being laid
          // out and says so in the learner's terms. The checks line keeps the
          // runner's own, finer-grained ones.
          panel.gate('staging', 'Setting up the task');
          setChecksStatus(detail.replace(/[.…]+$/, '').toLowerCase(), 'var(--color-hint)');
        }
      },
      checklist: renderChecklist,
      setupFailed: (failures) => {
        // A lesson whose setup fails is broken, not failed by the learner. Say
        // so plainly rather than leaving them staring at a list that cannot
        // pass.
        console.error('lesson setup failed', failures);
        setChecksStatus('setup failed', 'var(--color-alert)');
      },
      complete: () => showCompletion(),
    });

    // A handle for debugging a live session from the console:
    // `__learntmux.send('\r')`, `__learntmux.machine.control.run('tmux ls')`.
    // It is the only practical way to inspect a guest misbehaving in someone
    // else's browser.
    (window as unknown as Record<string, unknown>).__learntmux = {
      machine,
      runner,
      spec,
      send: (text: string) => machine?.send(text),
    };

    return runner;
  }

  function showCompletion(): void {
    markComplete(spec.slug);
    updateProgressCount();

    if (completionTime && startedAt) {
      completionTime.textContent = formatElapsed(Date.now() - startedAt);
    }
    if (completionHints) {
      completionHints.textContent =
        hintsRevealed === 0
          ? 'no hints'
          : hintsRevealed === 1
            ? 'one hint'
            : `${hintsRevealed} hints`;
    }

    working.forEach((node) => (node.hidden = true));
    if (completion) completion.hidden = false;
    completion?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });

    // Deferred, and warmed when the machine started: by now the chunk is in
    // the cache and this resolves in the same tick, so the burst lands with
    // the swap rather than a beat after it. It throws from the corners of the
    // viewport, so it does not care that the scroll above is still running.
    void import('../lib/confetti').then(({ fire }) => fire());
  }

  document.querySelector('[data-keep-playing]')?.addEventListener('click', () => {
    if (completion) completion.hidden = true;
    working.forEach((node) => (node.hidden = false));
    machine?.view.focus();
  });

  // ------------------------------------------------------------------- start

  let started = false;

  async function startLesson(): Promise<void> {
    if (started) return;
    started = true;
    startedAt = Date.now();
    panel.cancelAutoStart();

    panel.gate('busy', 'Fetching the emulator.');
    panel.status('loading', 'loading the emulator');

    try {
      // Warmed here so the celebration is instant later: this gesture has
      // already committed to 15 MB, and the confetti is under 2 KB of it.
      void import('../lib/confetti');
      loading ??= loadRunner();
      const ready = await loading;
      await ready.start(spec);
    } catch (error) {
      // Reaching here means the chunk itself failed, before there was a runner
      // to report through.
      console.error('could not load the terminal', error);
      loading = null;
      panel.status('failed', 'machine stopped');
      setChecksStatus('not running', 'var(--color-alert)');
      panel.gate('failed');
      started = false;
    }
  }

  panel.startButton?.addEventListener('click', () => void startLesson());
  panel.autoStart(() => void startLesson());

  panel.resetButton?.addEventListener('click', () => {
    if (!runner) return;
    // The editor covers the terminal rather than the page now, so Reset is
    // reachable while the guest is still blocked in `open`. Cancelling first
    // hands the tty back before the setup script starts typing into it.
    panel.cancelEditor();
    if (completion) completion.hidden = true;
    working.forEach((node) => (node.hidden = false));
    startedAt = Date.now();
    void runner.start(spec);
  });

  // ------------------------------------------------------------------- hints

  const hintPanel = document.querySelector<HTMLElement>('[data-hints]');
  if (hintPanel) {
    const items = [...hintPanel.querySelectorAll<HTMLElement>('[data-hint-index]')];
    const revealButton = hintPanel.querySelector<HTMLButtonElement>('[data-hint-reveal]');
    const prompt = hintPanel.querySelector<HTMLElement>('[data-hint-prompt]');

    // A hint already spent on a previous visit stays spent: re-hiding it would
    // pretend the task was solved unaided.
    const alreadyUsed = readProgress().hintsUsed[spec.slug] ?? 0;

    const reveal = (upTo: number): void => {
      hintsRevealed = Math.min(upTo, items.length);
      items.forEach((item, index) => {
        item.hidden = index >= hintsRevealed;
      });
      const left = items.length - hintsRevealed;
      if (prompt) {
        prompt.textContent =
          hintsRevealed === 0
            ? 'Stuck on this one?'
            : left === 0
              ? 'That is every hint.'
              : `${left} more hint${left === 1 ? '' : 's'} if you need one.`;
      }
      if (revealButton) {
        revealButton.hidden = left === 0;
        revealButton.textContent = hintsRevealed === 0 ? 'Show a hint' : 'Show another hint';
      }
    };

    if (alreadyUsed > 0) reveal(alreadyUsed);

    revealButton?.addEventListener('click', () => {
      reveal(hintsRevealed + 1);
      recordHintUsed(spec.slug, hintsRevealed);
    });
  }

  // ---------------------------------------------------------------- progress

  function updateProgressCount(): void {
    const count = readProgress().completed.length;
    document.querySelectorAll<HTMLElement>('[data-progress-count]').forEach((node) => {
      node.textContent = String(count);
    });

    const bar = document.querySelector<HTMLElement>('[data-progress-bar]');
    const fill = document.querySelector<HTMLElement>('[data-progress-fill]');
    const total = Number(bar?.getAttribute('aria-valuemax')) || 0;
    if (bar && fill && total > 0) {
      bar.setAttribute('aria-valuenow', String(count));
      bar.setAttribute('aria-valuetext', `${count} of ${total} tasks done`);
      fill.style.width = `${Math.min(100, (count / total) * 100)}%`;
    }
  }

  /** Tick the tasks already finished, in the navigator and anywhere else they appear. */
  function markCompletedLinks(): void {
    const completed = new Set(readProgress().completed);
    document.querySelectorAll<HTMLElement>('[data-picker-item]').forEach((link) => {
      if (!completed.has(link.dataset.pickerItem ?? '')) return;
      const mark = link.querySelector<HTMLElement>('[data-picker-mark]');
      if (mark) {
        mark.textContent = '✓';
        mark.style.color = 'var(--color-accent)';
        mark.setAttribute('aria-label', 'done');
      }
    });

    // "3/11" against each level in the rail. Counted off the links already in
    // the panel, so the rail needs no lesson data of its own.
    document.querySelectorAll<HTMLElement>('[data-nav-level-count]').forEach((node) => {
      const list = document.querySelector(`[data-nav-list="${node.dataset.navLevelCount}"]`);
      if (!list) return;
      const links = Array.from(list.querySelectorAll<HTMLElement>('[data-picker-item]'));
      const done = links.filter((link) => completed.has(link.dataset.pickerItem ?? '')).length;
      node.textContent = `${done}/${links.length}`;
      node.style.color = done === links.length ? 'var(--color-accent)' : '';
    });
  }

  panel.gate('idle');
  updateProgressCount();
  markCompletedLinks();

  // The navigator is a <details>; close it when a click or focus leaves, or on
  // Escape. The level rail switches itself, in CSS — the only thing left for the
  // script is putting the rail back on the level you are actually in once the
  // panel is shut, so reopening it never lands somewhere else.
  const nav = document.querySelector<HTMLDetailsElement>('[data-course-nav]');
  if (nav) {
    const close = (): void => {
      nav.open = false;
      nav.querySelector<HTMLInputElement>('[data-nav-default]')?.click();
    };

    // The list is 392px tall and a level runs to twelve tasks, so on the later
    // ones the task you are on opens below the fold. Only possible once the
    // panel is open: until then its list is display:none and has no scroll box.
    nav.addEventListener('toggle', () => {
      if (!nav.open) return;
      nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    });

    document.addEventListener('click', (event) => {
      if (nav.open && !nav.contains(event.target as Node)) close();
    });
    document.addEventListener('focusin', (event) => {
      if (nav.open && !nav.contains(event.target as Node)) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.open) {
        close();
        nav.querySelector<HTMLElement>('summary')?.focus();
      }
    });
  }
}
