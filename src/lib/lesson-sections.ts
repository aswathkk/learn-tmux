/**
 * Splitting a lesson into the parts the learn screen shows separately.
 *
 * Every lesson has four core second-level sections — Concept, Do this, What
 * just happened, Go further — plus an optional More detail section. Concept
 * and Do this are what you read while working; What just happened and Go
 * further only appear once every check has passed, which is the whole point of
 * the completion state. More detail is a deliberate, optional disclosure after
 * the steps rather than an automatic fold of otherwise visible prose.
 *
 * The split is done on the rendered HTML rather than the markdown source, so
 * the content pipeline (syntax highlighting, heading ids, smart quotes) has
 * already run and this file never has to parse markdown.
 */
import type { CollectionEntry } from 'astro:content';

export interface LessonSections {
  concept: string;
  /** Optional supporting explanation, intentionally placed after the steps. */
  moreDetail: string;
  /** The authored title of the optional disclosure. */
  moreDetailTitle: string;
  steps: string;
  whatHappened: string;
  goFurther: string;
}

const EMPTY: LessonSections = {
  concept: '',
  moreDetail: '',
  moreDetailTitle: '',
  steps: '',
  whatHappened: '',
  goFurther: '',
};

/** Split a rendered unordered list into its immediate list items. */
function splitListItems(listHtml: string): string[] {
  const items: string[] = [];
  const tagPattern = /<(\/?)(li)\b[^>]*>/gi;
  let depth = 0;
  let start = -1;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(listHtml)) !== null) {
    const isClosing = match[1] === '/';
    if (!isClosing) {
      if (depth === 0) start = match.index + match[0].length;
      depth++;
    }
    else {
      depth--;
      if (depth === 0 && start !== -1) {
        items.push(listHtml.slice(start, match.index).trim());
        start = -1;
      }
    }
  }

  return items;
}

/**
 * The revised source marks parallel ideas as markdown lists. When every item
 * uses an em dash, that punctuation is editorial data: turn it into an actual
 * label/value list instead of painting a bullet list that the reader must
 * mentally re-tabulate. A causal chain keeps its own arrow but loses bullets.
 */
function renderConceptRows(html: string): string {
  return html.replace(/<ul>([\s\S]*?)<\/ul>/g, (list, itemsHtml: string) => {
    const items = splitListItems(itemsHtml);
    if (items.length === 0) return list;

    const pairs = items.map((item) => {
      const divider = item.indexOf(' — ');
      return divider === -1 ? null : [item.slice(0, divider), item.slice(divider + 3)];
    });

    if (pairs.every((pair): pair is [string, string] => pair !== null)) {
      return `<dl class="lesson-rows">${pairs
        .map(([label, description]) => `<div><dt>${label}</dt><dd>${description}</dd></div>`)
        .join('')}</dl>`;
    }

    return items.every((item) => item.includes(' → '))
      ? `<ol class="lesson-chain">${items.map((item) => `<li>${item}</li>`).join('')}</ol>`
      : list;
  });
}

/** "What just happened" -> "whathappened", so heading text can be matched loosely. */
function normalise(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Split rendered lesson HTML at its <h2> boundaries.
 *
 * The headings themselves are dropped: the screen supplies its own, styled to
 * match the panel each section lands in.
 */
export function splitLessonHtml(html: string): LessonSections {
  if (!html) return { ...EMPTY };

  const sections: LessonSections = { ...EMPTY };
  // Capture each <h2 ...>text</h2> and everything up to the next one.
  const pattern = /<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|$)/g;

  for (const match of html.matchAll(pattern)) {
    // Heading text can contain inline markup; strip it before matching.
    const heading = match[1].replace(/<[^>]+>/g, '').trim();
    const key = normalise(heading);
    const body = match[2].trim();

    if (key === 'concept') {
      sections.concept = renderConceptRows(body);
    }
    else if (key === 'dothis') sections.steps = body;
    else if (key === 'whatjusthappened') sections.whatHappened = body;
    else if (key === 'gofurther') sections.goFurther = body;
    // An authored heading between Concept and Do this is optional supporting
    // detail. Its title is rendered directly, so the source owns the label.
    else if (sections.concept && !sections.steps && !sections.moreDetail) {
      sections.moreDetail = body;
      sections.moreDetailTitle = heading;
    }
  }

  return sections;
}

/**
 * The rendered HTML for a lesson.
 *
 * `rendered` is populated by the content layer for markdown entries. It is
 * typed optional, so a missing value returns empty sections rather than
 * throwing: the page still renders, just without prose.
 */
export function lessonSections(entry: CollectionEntry<'lessons'>): LessonSections {
  return splitLessonHtml(entry.rendered?.html ?? '');
}
