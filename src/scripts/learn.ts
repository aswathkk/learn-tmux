/**
 * The learn screen's client.
 *
 * Its job is to connect three things that already exist: the lesson spec baked
 * into the page, the machine in src/lib/vm, and the markup rendered by the
 * lesson page. It renders nothing from scratch — every row, hint and panel is
 * already in the HTML, and this only toggles state on them.
 *
 * Nothing here loads the emulator until the learner asks for it. That is the
 * whole reason the gate exists: 15 MB and an x86 CPU on the main thread is not
 * something to spend on someone who came to read. It used to be only half true.
 * The v86 image was gated, but xterm.js, the machine and the CodeMirror overlay
 * were static imports, so every lesson page pulled 634 KB — 176 KB over the
 * wire — before the gate was touched, on a page whose entire premise is that it
 * is readable before any JavaScript runs. They are behind `import()` now: what
 * loads eagerly is this file, and this file is the hints, the picker, the
 * progress count and the completion swap.
 *
 * The stylesheet stays eager. It is 4 KB, it has no JavaScript cost, and moving
 * it into the deferred chunk would land it after global.css and undo the
 * `.xterm.terminal` overrides there.
 */
import '@xterm/xterm/css/xterm.css';

import type { TmuxMachine, MachineStatus } from '../lib/vm/machine';
import type { EditorOverlay } from '../lib/vm/editor';
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
  const mount = document.querySelector<HTMLElement>('[data-terminal-mount]');
  if (!specNode || !mount) return;

  const spec = JSON.parse(specNode.textContent ?? '{}') as PageSpec;

  const gate = document.querySelector<HTMLElement>('[data-terminal-gate]');
  const gateTitle = document.querySelector<HTMLElement>('[data-gate-title]');
  const gateBody = document.querySelector<HTMLElement>('[data-gate-body]');
  const gateNote = document.querySelector<HTMLElement>('[data-gate-note]');
  const startButton = document.querySelector<HTMLButtonElement>('[data-terminal-start]');
  const progressBar = document.querySelector<HTMLElement>('[data-terminal-progress]');
  const statusPill = document.querySelector<HTMLElement>('[data-terminal-status]');
  const statusText = document.querySelector<HTMLElement>('[data-terminal-status-text]');
  const statusDot = document.querySelector<HTMLElement>('[data-terminal-dot]');
  const sizeLabel = document.querySelector<HTMLElement>('[data-terminal-size]');
  const resetButton = document.querySelector<HTMLButtonElement>('[data-lesson-reset]');
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

  // -------------------------------------------------------------------- gate

  const GATE_COPY = {
    title: 'A real terminal, in this tab',
    body: 'Alpine Linux and tmux 3.4 on an x86 emulator. Nothing to install, and no server behind it.',
    note: 'about 15 MB, once',
    action: 'Start the terminal',
  };

  /**
   * The gate is the machine's whole face until the machine has one.
   *
   * It used to be hidden the instant Start was clicked, which left the learner
   * watching an empty black rectangle for the length of a 15 MB download — and
   * left them watching it forever if the download failed, with no control on
   * screen to try again.
   */
  function setGate(state: 'idle' | 'busy' | 'failed', detail = ''): void {
    if (!gate) return;
    gate.hidden = false;

    if (state === 'busy') {
      if (gateTitle) gateTitle.textContent = 'Starting the machine';
      if (gateBody) gateBody.textContent = detail || 'Fetching the emulator.';
      if (gateNote) gateNote.textContent = 'first time only — it is cached after this';
      if (startButton) {
        startButton.disabled = true;
        startButton.textContent = 'Starting…';
      }
      return;
    }

    if (state === 'failed') {
      // The gate is the only one of the four places this state shows that has
      // room to say anything useful, so it is the only one that says more than
      // what happened. The status line and the checklist get a label.
      if (gateTitle) gateTitle.textContent = 'The machine did not start';
      if (gateBody) {
        gateBody.textContent =
          detail ||
          'Check your connection and try again. The lesson, the steps and the hints are all on this page either way.';
      }
      if (gateNote) gateNote.textContent = 'nothing you did';
      if (startButton) {
        startButton.disabled = false;
        startButton.textContent = 'Try again';
      }
      return;
    }

    if (gateTitle) gateTitle.textContent = GATE_COPY.title;
    if (gateBody) gateBody.textContent = GATE_COPY.body;
    if (gateNote) gateNote.textContent = GATE_COPY.note;
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = GATE_COPY.action;
    }
  }

  // ------------------------------------------------------------------ status

  const dotColour: Record<MachineStatus, string> = {
    idle: 'var(--color-ring)',
    loading: 'var(--color-hint)',
    booting: 'var(--color-hint)',
    ready: 'var(--color-accent)',
    failed: 'var(--color-alert)',
  };

  /**
   * The status line under the terminal. At rest it says the session and the
   * grid size and nothing else; it only speaks while the machine is doing
   * something or has stopped.
   */
  function setStatus(status: MachineStatus, detail: string): void {
    if (statusPill) statusPill.dataset.state = status;
    if (statusDot) {
      statusDot.style.background = dotColour[status];
      statusDot.hidden = status === 'idle' || status === 'ready';
    }
    // On `ready` the machine reports its own size, which the line already
    // carries a few characters to the left.
    if (statusText) statusText.textContent = status === 'ready' ? '' : detail;
  }

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
  let editor: EditorOverlay | null = null;
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
      container: mount!,
      events: {
        status: (status, detail) => {
          setStatus(status, detail);
          if (status === 'loading' || status === 'booting') setGate('busy', detail);
          if (status === 'ready') {
            if (gate) gate.hidden = true;
            if (sizeLabel && machine) {
              const { cols, rows } = machine.view.size;
              // Written with its own separator so the line reads correctly
              // before a size is known.
              sizeLabel.textContent = ` · ${cols}×${rows}`;
            }
            if (resetButton) resetButton.disabled = false;
          }
        },
        progress: (fraction) => {
          if (progressBar) progressBar.style.width = `${Math.round(fraction * 100)}%`;
        },
        openFile: (path, contents) => void showEditor(path, contents),
      },
    });

    runner = new LessonRunner(machine, {
      phase: (phase: RunnerPhase, detail: string) => {
        if (phase === 'error') {
          setStatus('failed', 'machine stopped');
          setChecksStatus('not running', 'var(--color-alert)');
          // The gate writes its own copy: `detail` is a one-line summary sized
          // for a status line, and the gate has a paragraph to fill.
          setGate('failed');
          started = false;
        } else if (phase === 'watching') {
          setChecksStatus('watching your terminal', 'var(--color-accent)');
        } else if (phase !== 'complete') {
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

  /** The editor is Level 4's, so it arrives when a lesson first opens a file. */
  async function showEditor(path: string, contents: string): Promise<void> {
    const editorRoot = document.querySelector<HTMLElement>('[data-editor]');
    if (!editorRoot || !machine) return;

    if (!editor) {
      const { EditorOverlay } = await import('../lib/vm/editor');
      editor = new EditorOverlay({
        elements: {
          root: editorRoot,
          host: editorRoot.querySelector<HTMLElement>('[data-editor-host]')!,
          pathLabel: editorRoot.querySelector<HTMLElement>('[data-editor-path]')!,
          dirtyFlag: editorRoot.querySelector<HTMLElement>('[data-editor-dirty]')!,
          saveKeyLabel: editorRoot.querySelector<HTMLElement>('[data-editor-save-key]')!,
          saveButton: editorRoot.querySelector<HTMLElement>('[data-editor-save]')!,
          cancelButton: editorRoot.querySelector<HTMLElement>('[data-editor-cancel]')!,
        },
        send: (text) => machine?.send(text),
        onClose: () => machine?.view.focus(),
      });
    }

    editor.show(path, contents);
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

    setGate('busy', 'Fetching the emulator.');
    setStatus('loading', 'loading the emulator');

    try {
      loading ??= loadRunner();
      const ready = await loading;
      await ready.start(spec);
    } catch (error) {
      // Reaching here means the chunk itself failed, before there was a runner
      // to report through.
      console.error('could not load the terminal', error);
      loading = null;
      setStatus('failed', 'machine stopped');
      setChecksStatus('not running', 'var(--color-alert)');
      setGate('failed');
      started = false;
    }
  }

  startButton?.addEventListener('click', () => void startLesson());

  resetButton?.addEventListener('click', () => {
    if (!runner) return;
    // The editor covers the terminal rather than the page now, so Reset is
    // reachable while the guest is still blocked in `open`. Cancelling first
    // hands the tty back before the setup script starts typing into it.
    if (editor?.isOpen) editor.cancel();
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

  /** Tick the tasks already finished, in the picker and anywhere else they appear. */
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
  }

  setGate('idle');
  updateProgressCount();
  markCompletedLinks();

  // The picker is a <details>; close it when a click or focus leaves, or on Escape.
  const picker = document.querySelector<HTMLDetailsElement>('[data-task-picker]');
  if (picker) {
    document.addEventListener('click', (event) => {
      if (picker.open && !picker.contains(event.target as Node)) picker.open = false;
    });
    document.addEventListener('focusin', (event) => {
      if (picker.open && !picker.contains(event.target as Node)) picker.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && picker.open) {
        picker.open = false;
        picker.querySelector<HTMLElement>('summary')?.focus();
      }
    });
  }
}
