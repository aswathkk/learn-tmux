/**
 * Progress, kept in the browser.
 *
 * There are no accounts. Progress is one localStorage key, written when a task
 * completes and read to light up the levels grid, the "N / 42" counter and the
 * earned rows of the cheat sheet.
 *
 * Every read is defensive: private windows, cleared site data and storage-
 * blocking settings all make this throw or return nothing, and none of that is
 * a reason for the page to fail.
 */
const STORAGE_KEY = 'learntmux.progress.v1';

export interface Progress {
  /** Lesson slugs that have had every check pass. */
  completed: string[];
  /** Lesson slug -> hints revealed, so a reload does not re-hide them. */
  hintsUsed: Record<string, number>;
  /** Lesson slug -> ISO timestamp of first completion. */
  completedAt: Record<string, string>;
}

const empty = (): Progress => ({ completed: [], hintsUsed: {}, completedAt: {} });

export function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      hintsUsed: typeof parsed.hintsUsed === 'object' && parsed.hintsUsed ? parsed.hintsUsed : {},
      completedAt:
        typeof parsed.completedAt === 'object' && parsed.completedAt ? parsed.completedAt : {},
    };
  } catch {
    return empty();
  }
}

function write(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable. The session still works; it just will not be remembered.
  }
}

export function markComplete(slug: string): Progress {
  const progress = readProgress();
  if (!progress.completed.includes(slug)) {
    progress.completed.push(slug);
    progress.completedAt[slug] = new Date().toISOString();
    write(progress);
  }
  return progress;
}

export function recordHintUsed(slug: string, revealed: number): void {
  const progress = readProgress();
  progress.hintsUsed[slug] = Math.max(progress.hintsUsed[slug] ?? 0, revealed);
  write(progress);
}

export function isComplete(slug: string): boolean {
  return readProgress().completed.includes(slug);
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to do
  }
}
