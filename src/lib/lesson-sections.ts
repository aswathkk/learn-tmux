/**
 * Splitting a lesson into the parts the learn screen shows separately.
 *
 * Every lesson has exactly four second-level sections — Concept, Do this, What
 * just happened, Go further — and the screen does not show them in one column.
 * Concept and Do this are what you read while working; What just happened and
 * Go further only appear once every check has passed, which is the whole point
 * of the completion state.
 *
 * The split is done on the rendered HTML rather than the markdown source, so
 * the content pipeline (syntax highlighting, heading ids, smart quotes) has
 * already run and this file never has to parse markdown.
 */
import type { CollectionEntry } from 'astro:content';

export interface LessonSections {
  /** Prose before the first heading. Usually the one-paragraph scene-setter. */
  intro: string;
  concept: string;
  /**
   * The first paragraph of Concept, shown inline.
   *
   * The Concept sections run to four or five paragraphs. All of it is worth
   * reading eventually and none of it is worth reading before you have typed
   * anything, so the screen shows the lead and folds the rest away.
   */
  conceptLead: string;
  /** Everything after that first paragraph. Rendered collapsed. */
  conceptRest: string;
  steps: string;
  whatHappened: string;
  goFurther: string;
}

const EMPTY: LessonSections = {
  intro: '',
  concept: '',
  conceptLead: '',
  conceptRest: '',
  steps: '',
  whatHappened: '',
  goFurther: '',
};

/**
 * Split rendered HTML after its first top-level paragraph.
 *
 * Only splits on a `</p>` that closes the opening `<p>`, so a paragraph
 * containing inline markup stays whole.
 */
function splitAfterFirstParagraph(html: string): [string, string] {
  const trimmed = html.trim();
  if (!trimmed.startsWith('<p')) return [trimmed, ''];
  const end = trimmed.indexOf('</p>');
  if (end === -1) return [trimmed, ''];
  const cut = end + '</p>'.length;
  return [trimmed.slice(0, cut), trimmed.slice(cut).trim()];
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

  const firstHeading = html.search(/<h2\b/);
  sections.intro = (firstHeading === -1 ? html : html.slice(0, firstHeading)).trim();

  for (const match of html.matchAll(pattern)) {
    // Heading text can contain inline markup; strip it before matching.
    const key = normalise(match[1].replace(/<[^>]+>/g, ''));
    const body = match[2].trim();

    if (key === 'concept') {
      sections.concept = body;
      const [lead, rest] = splitAfterFirstParagraph(body);
      sections.conceptLead = lead;
      sections.conceptRest = rest;
    }
    else if (key === 'dothis') sections.steps = body;
    else if (key === 'whatjusthappened') sections.whatHappened = body;
    else if (key === 'gofurther') sections.goFurther = body;
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
