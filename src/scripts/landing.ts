/**
 * Progress on the landing page.
 *
 * The page is built for someone who has done nothing: no bars filled, the
 * button says "Start Level 1". This fills in what the browser knows afterwards,
 * so a returning reader lands on the task they stopped at instead of being sent
 * back to the beginning.
 *
 * Nothing here is required for the page to be correct — if storage is
 * unavailable or the script never runs, the starting state is the truth.
 */
import { readProgress } from '../lib/progress';

/** Fill a bar and, where present, its `aria-valuenow`. */
function fill(bar: HTMLElement | null, done: number, total: number): void {
  if (!bar || total <= 0) return;
  bar.style.width = `${Math.min(100, Math.round((done / total) * 100))}%`;
  bar.setAttribute('aria-valuenow', String(done));
}

export function mountLandingProgress(): void {
  const completed = new Set(readProgress().completed);
  if (completed.size === 0) return;

  // Course-wide bar under the levels heading.
  const courseBar = document.querySelector<HTMLElement>('[data-course-progress]');
  fill(courseBar, completed.size, Number(courseBar?.dataset.total) || 0);

  // Per-level bars and counts.
  let resumeHref: string | null = null;
  let resumeLevel: string | null = null;

  document.querySelectorAll<HTMLAnchorElement>('[data-level-card]').forEach((card) => {
    const slugs = (card.dataset.slugs ?? '').split(' ').filter(Boolean);
    if (!slugs.length) return;

    const done = slugs.filter((slug) => completed.has(slug)).length;
    fill(card.querySelector<HTMLElement>('[data-level-progress]'), done, slugs.length);

    const badge = card.querySelector<HTMLElement>('[data-level-badge]');
    if (badge) {
      badge.textContent =
        done === 0
          ? `${slugs.length} tasks`
          : done === slugs.length
            ? `✓ all ${slugs.length}`
            : `${done} / ${slugs.length}`;
      if (done === slugs.length) badge.style.color = 'var(--color-accent)';
    }

    // The first level with anything left is where "Resume" points.
    if (!resumeHref && done < slugs.length) {
      resumeHref = card.href;
      resumeLevel = card.querySelector('h3')?.textContent?.trim() ?? null;
    }
  });

  const link = document.querySelector<HTMLAnchorElement>('[data-resume-link]');
  const label = document.querySelector<HTMLElement>('[data-resume-label]');
  if (link && label && resumeHref) {
    link.href = resumeHref;
    label.textContent = resumeLevel ? `Resume · ${resumeLevel}` : 'Resume';
  } else if (link && label) {
    // Everything is done.
    link.href = '/cheatsheet/';
    label.textContent = 'See your cheat sheet';
  }
}
