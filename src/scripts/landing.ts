/**
 * Progress on the landing page, and the start button that follows the reader.
 *
 * The page is built for someone who has done nothing: no bars filled, every
 * start button says "Start the first task". This fills in what the browser
 * knows afterwards, so a returning reader lands on the task they stopped at
 * instead of being sent back to the beginning.
 *
 * Nothing here is required for the page to be correct — if storage is
 * unavailable or the script never runs, the starting state is the truth and the
 * floating bar simply never appears.
 */
import { readProgress } from '../lib/progress';

/**
 * Show the floating start button once the hero has scrolled away, and hide it
 * again over the closing section — which offers the same thing with room to say
 * what it is — and over the footer, whose links it would otherwise sit on.
 */
function mountStartBar(): void {
  const bar = document.querySelector<HTMLElement>('[data-start-bar]');
  if (!bar || typeof IntersectionObserver === 'undefined') return;

  const covers = ['#hero', '#start-cta', 'footer']
    .map((selector) => document.querySelector(selector))
    .filter((element): element is Element => element !== null);
  if (!covers.length) return;

  const onScreen = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      // `inert` moves with the attribute, not after it. Without it the bar is
      // still in the tab order while invisible, and because it lives after
      // </main> it is the last thing a keyboard reaches — at the footer, which
      // is exactly when it is hidden.
      if (onScreen.size) {
        bar.removeAttribute('data-visible');
        bar.setAttribute('inert', '');
      } else {
        bar.setAttribute('data-visible', '');
        bar.removeAttribute('inert');
      }
    },
    // A sliver of either section counts as on screen: the bar should be gone
    // before it can overlap the button it duplicates.
    { rootMargin: '0px 0px -20% 0px' },
  );

  for (const cover of covers) observer.observe(cover);
}

/** Fill a bar and, where present, its `aria-valuenow`. */
function fill(bar: HTMLElement | null, done: number, total: number): void {
  if (!bar || total <= 0) return;
  bar.style.width = `${Math.min(100, Math.round((done / total) * 100))}%`;
  bar.setAttribute('aria-valuenow', String(done));
}

export function mountLandingProgress(): void {
  mountStartBar();

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

  // Every start button on the page: the hero's, the closing call and the sticky bar.
  document.querySelectorAll<HTMLAnchorElement>('[data-resume-link]').forEach((link) => {
    const label = link.querySelector<HTMLElement>('[data-resume-label]');
    if (!label) return;
    // A caption under some of these buttons names the first task. It has to
    // move with the label, or the button offers to resume above a line
    // promising task one. It is sometimes inside the button and sometimes a
    // sibling, so the group is what gets searched.
    const scope = link.closest<HTMLElement>('[data-resume-group]') ?? link;
    const sub = scope.querySelector<HTMLElement>('[data-resume-sub]');
    if (resumeHref) {
      link.href = resumeHref;
      label.textContent = resumeLevel ? `Resume · ${resumeLevel}` : 'Resume';
      if (sub) sub.textContent = 'Picks up where you stopped';
    } else {
      // Everything is done.
      link.href = '/cheatsheet/';
      label.textContent = 'See your cheat sheet';
      if (sub) sub.textContent = `All ${completed.size} tasks done`;
    }
  });
}
