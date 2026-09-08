/**
 * Grading.
 *
 * Every check in a lesson runs on the control channel in a single round trip,
 * on a timer, and latches once it passes. There is no "check my work" button:
 * the list ticks itself off as the learner works.
 *
 * Latching is what makes sequential lessons possible. "Detached" and
 * "reattached" are both true at some point but never at the same moment, so
 * each one latches as the learner passes through it.
 *
 * Latching alone would be too generous, though. "A client is attached" is
 * already true when the lesson starts. So the list is evaluated once right
 * after setup, and anything already passing is marked pre-satisfied: those
 * checks only latch after every check above them has, which is the order the
 * lesson teaches.
 */
import type { ControlChannel } from '../vm/control';
import type { Check } from './types';

const MARK = '__CHK__';

export interface CheckResult {
  check: Check;
  passes: boolean;
  /** Trimmed output of the check's command, shown as "now: …" while it fails. */
  output: string;
}

/**
 * Run the whole list in one round trip rather than one command per check.
 * Each check's output is fenced by a marker carrying its index, because the
 * commands themselves can print anything.
 */
export async function evaluateChecks(
  control: ControlChannel,
  checks: Check[],
  timeoutMs = 15_000,
): Promise<CheckResult[]> {
  if (!checks.length) return [];

  const script = checks
    .map((check, index) => {
      const command = check.kind === 'tmux' ? `tmux ${check.command}` : check.command;
      return `printf '\\n%s%d\\n' ${MARK} ${index}; { ${command} ; } 2>&1`;
    })
    .join('; ');

  const { output } = await control.run(script, timeoutMs);
  const parts = output.split(new RegExp(`\\n?${MARK}(\\d+)\\n`));

  const outputs = checks.map(() => '');
  for (let i = 1; i < parts.length; i += 2) {
    outputs[Number(parts[i])] = (parts[i + 1] ?? '').replace(/\n$/, '').trim();
  }

  return checks.map((check, index) => {
    let passes = false;
    try {
      passes = new RegExp(check.expect).test(outputs[index]);
    } catch {
      // A malformed regex is caught at build time by the content schema; if one
      // gets this far, treat it as never passing rather than throwing here.
      passes = false;
    }
    return { check, passes, output: outputs[index] };
  });
}

export interface ChecklistState {
  /** Indices that have latched. */
  done: Set<number>;
  /** Indices that were already true before the learner did anything. */
  preSatisfied: Set<number>;
  results: CheckResult[];
  complete: boolean;
}

/**
 * Tracks which checks have latched across polls.
 *
 * Kept separate from the polling loop so the ordering rule is testable on its
 * own and the UI can render from a plain snapshot.
 */
export class Checklist {
  #checks: Check[];
  #done = new Set<number>();
  #preSatisfied = new Set<number>();
  #results: CheckResult[] = [];

  constructor(checks: Check[]) {
    this.#checks = checks;
  }

  /** Record the state right after setup: anything already true proves nothing yet. */
  prime(results: CheckResult[]): void {
    this.#results = results;
    this.#preSatisfied = new Set(
      results.map((result, index) => (result.passes ? index : -1)).filter((index) => index >= 0),
    );
  }

  /** Fold a fresh evaluation into the latched state. */
  update(results: CheckResult[]): void {
    this.#results = results;
    results.forEach((result, index) => {
      if (this.#done.has(index) || !result.passes) return;

      if (this.#preSatisfied.has(index)) {
        // Only credit a pre-satisfied check once everything above it has
        // latched, which is the order the lesson teaches.
        for (let earlier = 0; earlier < index; earlier++) {
          if (!this.#done.has(earlier)) return;
        }
      }
      this.#done.add(index);
    });
  }

  get state(): ChecklistState {
    return {
      done: new Set(this.#done),
      preSatisfied: new Set(this.#preSatisfied),
      results: this.#results,
      complete: this.#checks.length > 0 && this.#done.size === this.#checks.length,
    };
  }
}
