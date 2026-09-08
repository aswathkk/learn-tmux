/**
 * The lesson runner: stage a task, then grade it until it is done.
 *
 * Picking a task does three things.
 *
 *   1. Reset. Restore the in-memory baseline taken at boot. No download, no
 *      reboot, so a task can be restarted as often as the learner likes.
 *   2. Setup. The lesson's `setup` commands run on the control channel, so
 *      nothing they do appears in the terminal the learner is using.
 *   3. Start. The lesson's `startCommand` is typed into the visible terminal,
 *      because that is the learner's own client.
 *
 * Then the checks poll themselves (see checks.ts) until every one has latched.
 */
import type { TmuxMachine } from '../vm/machine';
import { Checklist, evaluateChecks, type ChecklistState } from './checks';
import type { LessonSpec } from './types';

const POLL_INTERVAL_MS = 1500;
const SETUP_TIMEOUT_MS = 20_000;

/**
 * How long to let the lesson's own `startCommand` take effect before deciding
 * what was "already true".
 *
 * The pre-satisfied rule exists so a check that is true before the learner
 * touches anything cannot latch on its own. That only works if the snapshot is
 * taken once the machine has actually reached the lesson's starting state —
 * `tmux attach` takes a beat, and priming too early records "no client
 * attached", so the check for an attached client then latches the moment the
 * attach lands, crediting the learner for the lesson's own setup.
 */
const START_SETTLE_MS = 1200;

export type RunnerPhase = 'idle' | 'resetting' | 'staging' | 'watching' | 'complete' | 'error';

export interface SetupFailure {
  command: string;
  output: string;
}

export interface RunnerEvents {
  phase(phase: RunnerPhase, detail: string): void;
  checklist(state: ChecklistState): void;
  /** Setup commands that exited non-zero. A lesson that reports these is broken, not failed. */
  setupFailed(failures: SetupFailure[]): void;
  complete(): void;
}

export class LessonRunner {
  #machine: TmuxMachine;
  #events: Partial<RunnerEvents>;
  #spec: LessonSpec | null = null;
  #checklist: Checklist | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #busy = false;
  /** Bumped on every start; a poll from a previous task exits when it changes. */
  #generation = 0;

  constructor(machine: TmuxMachine, events: Partial<RunnerEvents> = {}) {
    this.#machine = machine;
    this.#events = events;
  }

  get isBusy(): boolean {
    return this.#busy;
  }

  /** Stage the lesson and begin grading. Safe to call again to restart the task. */
  async start(spec: LessonSpec): Promise<void> {
    if (this.#busy) return;
    this.#busy = true;
    this.#spec = spec;
    const generation = ++this.#generation;
    this.stop();

    try {
      await this.#machine.boot();
      await this.#machine.captureBaseline();

      if (!this.#machine.hasBaseline) {
        this.#events.phase?.('error', 'The machine is still starting. Try again in a moment.');
        return;
      }

      this.#events.phase?.('resetting', 'Resetting the machine…');
      await this.#machine.restoreBaseline();

      if (!(await this.#machine.control.waitUntilReady())) {
        this.#events.phase?.('error', 'The control channel did not come back.');
        return;
      }
      if (generation !== this.#generation) return;

      this.#machine.applySize();

      const failures: SetupFailure[] = [];
      if (spec.setup.length) {
        this.#events.phase?.('staging', `Running setup (${spec.setup.length} commands)…`);
        for (const command of spec.setup) {
          const { code, output } = await this.#machine.control.run(command, SETUP_TIMEOUT_MS);
          if (code !== 0) failures.push({ command, output });
        }
      }
      if (generation !== this.#generation) return;

      if (spec.startCommand) {
        // A beat, so the command is not typed into a terminal still redrawing.
        await new Promise((resolve) => setTimeout(resolve, 250));
        this.#machine.send(spec.startCommand + '\n');
        // Then let it land, so the pre-satisfied snapshot below describes where
        // the lesson actually starts.
        await new Promise((resolve) => setTimeout(resolve, START_SETTLE_MS));
      }

      if (failures.length) {
        this.#events.phase?.(
          'error',
          `${failures.length} of ${spec.setup.length} setup commands failed.`,
        );
        this.#events.setupFailed?.(failures);
      } else {
        this.#events.phase?.('watching', 'Watching your terminal — the list ticks itself off.');
      }

      this.#machine.view.focus();
    } catch (error) {
      // The learner gets what happened and what to do; the console keeps the
      // detail. Nothing here can be acted on by reading a path out of the
      // bundle — "Setup failed: could not load /vm/libv86.js" named a file
      // nobody outside this repository has ever heard of.
      console.error('lesson start failed', error);
      this.#events.phase?.('error', 'The machine did not start. Try again.');
      return;
    } finally {
      this.#busy = false;
    }

    if (generation === this.#generation) await this.#prime(spec, generation);
  }

  /** Evaluate once, mark what was already true, then start polling. */
  async #prime(spec: LessonSpec, generation: number): Promise<void> {
    const checklist = new Checklist(spec.checks);
    this.#checklist = checklist;
    this.#events.checklist?.(checklist.state);

    if (!spec.checks.length) return;

    try {
      const results = await evaluateChecks(this.#machine.control, spec.checks);
      if (generation !== this.#generation) return;
      checklist.prime(results);
      this.#events.checklist?.(checklist.state);
    } catch {
      // The first poll will retry.
    }

    this.#schedule(generation);
  }

  #schedule(generation: number): void {
    this.stop();
    this.#timer = setTimeout(() => void this.#poll(generation), POLL_INTERVAL_MS);
  }

  async #poll(generation: number): Promise<void> {
    const spec = this.#spec;
    const checklist = this.#checklist;
    if (!spec || !checklist || generation !== this.#generation) return;

    // Never grade while setup is mid-flight: the machine is not the learner's yet.
    if (this.#busy) {
      this.#schedule(generation);
      return;
    }

    try {
      const results = await evaluateChecks(this.#machine.control, spec.checks);
      if (generation !== this.#generation) return;
      checklist.update(results);
    } catch {
      this.#schedule(generation);
      return;
    }

    const state = checklist.state;
    this.#events.checklist?.(state);

    if (state.complete) {
      this.stop();
      this.#events.phase?.('complete', 'Task complete — every check passed.');
      this.#events.complete?.();
    } else {
      this.#schedule(generation);
    }
  }

  /** Stop polling. The machine and its state are left alone. */
  stop(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
