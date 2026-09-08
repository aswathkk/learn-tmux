/**
 * Turning a lesson's "Do this" prose into discrete steps.
 *
 * The design renders each step as its own row with a state marker: done, the
 * one you are on, or not yet reached. That needs the steps as separate pieces,
 * not as one block of rendered markdown, so the `<ol>` the content pipeline
 * produced is split back into its items here.
 *
 * The trailing "**Done when** …" sentence every lesson ends with is dropped: it
 * restates the checks, and the checks are their own panel on the right.
 */

/** Split the immediate children of an `<ol>` into the inner HTML of each `<li>`. */
function splitListItems(listHtml: string): string[] {
  const items: string[] = [];
  // Nested lists are rare but legal, so track depth rather than matching greedily.
  const tagPattern = /<(\/?)li\b[^>]*>/gi;
  let depth = 0;
  let start = -1;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(listHtml)) !== null) {
    const isClosing = match[1] === '/';
    if (!isClosing) {
      if (depth === 0) start = match.index + match[0].length;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start !== -1) {
        items.push(listHtml.slice(start, match.index).trim());
        start = -1;
      }
    }
  }
  return items;
}

/** Block-level tags the content pipeline can emit inside a list item. */
const BLOCK_TAGS = /<(p|div|ul|ol|pre|blockquote|table|h[1-6]|figure|details)\b/i;

/**
 * Give a step's content a paragraph to live in.
 *
 * Markdown only wraps list-item content in `<p>` when the list is "loose" —
 * when its items are separated by blank lines. Two thirds of the lessons write
 * tight lists, so their steps arrive as bare inline nodes. Wrapping them here
 * means every step has the same shape whichever way its lesson was written.
 */
function ensureBlock(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || BLOCK_TAGS.test(trimmed)) return trimmed;
  return `<p>${trimmed}</p>`;
}

export interface LessonSteps {
  /** One entry per numbered step, as rendered HTML. */
  steps: string[];
  /**
   * Anything in the section that was not part of the list — an intro line
   * before it, say. Rendered above the steps.
   */
  preamble: string;
}

/**
 * Parse the rendered "Do this" HTML.
 *
 * Falls back to treating the whole section as a single step when a lesson does
 * not use a numbered list, so an unusual lesson still renders something sane.
 */
export function parseSteps(stepsHtml: string): LessonSteps {
  if (!stepsHtml.trim()) return { steps: [], preamble: '' };

  const listStart = stepsHtml.search(/<ol\b/i);
  const listEnd = stepsHtml.toLowerCase().lastIndexOf('</ol>');

  if (listStart === -1 || listEnd === -1) {
    return { steps: [stepsHtml.trim()], preamble: '' };
  }

  const preamble = stepsHtml.slice(0, listStart).trim();
  const list = stepsHtml.slice(listStart, listEnd);
  const steps = splitListItems(list).map(ensureBlock).filter(Boolean);

  // Everything after the list is the "Done when" restatement; the checks panel
  // already says it, in plainer words.
  return { steps: steps.length ? steps : [stepsHtml.trim()], preamble };
}

export type StepState = 'done' | 'current' | 'todo';

/**
 * Which step the learner is on, derived from how many checks have latched.
 *
 * Steps and checks are not formally linked — a step can need two checks, and a
 * check can span two steps — so this maps progress proportionally rather than
 * claiming a one-to-one relationship it does not have. It is only ever used to
 * shade the list; the authoritative record of what is done is the checks panel.
 */
export function stepStates(
  stepCount: number,
  latchedChecks: number,
  totalChecks: number,
): StepState[] {
  if (stepCount === 0) return [];

  const completed =
    totalChecks > 0 ? Math.floor((latchedChecks / totalChecks) * stepCount) : 0;

  return Array.from({ length: stepCount }, (_, index) => {
    if (index < completed) return 'done';
    if (index === completed) return 'current';
    return 'todo';
  });
}
