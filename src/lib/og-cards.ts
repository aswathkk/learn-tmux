/**
 * Which pages get a social card, and what each one says.
 *
 * One list, built from the content collections, so "does every page have a
 * card?" is a question with an answer rather than a page-by-page audit. The
 * endpoint (src/pages/og/[...path].png.ts) draws everything in it, and
 * src/components/seo/Seo.astro looks a page up in it by its own URL — so a page
 * gets its card without having to remember to ask for one.
 *
 * Two pages are deliberately absent. The landing page has a hand-drawn card in
 * public/og-image.png, which is also the site-wide fallback and says the one
 * thing the whole site claims. A gallery entry unfurls as its own screenshot,
 * which is the entry; a drawn card would be a picture of a caption. A guide
 * behaves the same way when it has a cover, and gets a drawn card when it does
 * not.
 *
 * Card paths mirror page paths: /basics/zoom-a-pane is drawn at
 * /og/basics/zoom-a-pane.png. Nothing has to be unique across the site for that
 * to hold, and a card can be found from the page it belongs to without a
 * lookup table.
 */
import { fitChips, type OgCard } from './og';
import { getConfigs, configCategoryTally } from './configs';
import { getGuides, guideCategoryTally, guidePath, type GuideEntry } from './guides';
import { getCheatSheetSections } from './cheatsheet';
import {
  getCourseStats,
  getLessons,
  getLevelSummaries,
  lessonPath,
  levelPath,
  type LessonEntry,
  type LevelSummary,
} from './lessons';
import { readingTime } from './reading-time';
import {
  configCategoryPath,
  guideCategory,
  guideCategoryPath,
  type Category,
} from './taxonomy';
import { canonicalPath } from './seo';

export interface OgTarget {
  /** The page the card belongs to: canonical, slashless. */
  page: string;
  card: OgCard;
  /** What a reader who cannot see the card is told it says. */
  alt: string;
}

/** /basics/zoom-a-pane → /og/basics/zoom-a-pane.png */
export function ogImagePath(page: string): string {
  return `/og${canonicalPath(page)}.png`;
}

/** Distinct keys in the order the course teaches them. */
const keysOf = (lessons: LessonEntry[]): string[] => [
  ...new Set(lessons.flatMap((lesson) => lesson.data.keys.map((key) => key.key))),
];

/**
 * Derived rather than authored, and from the card rather than the page: the
 * alt text describes the image, so if the image says something else the two
 * cannot drift apart.
 */
const altOf = (card: OgCard): string =>
  `learntmux social card: ${card.title} — ${card.eyebrow}, ${card.meta}.`;

const target = (page: string, card: OgCard): OgTarget => ({ page, card, alt: altOf(card) });

/** One lesson: what it teaches, and where it falls in the course. */
function lessonCard(lesson: LessonEntry, position: number, total: number, level: string): OgCard {
  const { data } = lesson;
  return {
    eyebrow: level,
    title: data.title,
    accent: data.challenge ? 'challenge · no new keys' : undefined,
    chips: data.challenge ? [] : fitChips(data.keys.map((key) => key.key)),
    session: '[learn]',
    current: `${position}:${data.slug}*`,
    meta: `Task ${position} of ${total} · ${data.estimatedMinutes} min`,
  };
}

/** A level hub: the keys it opens with, and what it costs to finish. */
function levelCard(summary: LevelSummary): OgCard {
  const { level } = summary;
  return {
    eyebrow: `Level ${level.n} of 4`,
    title: level.seoTitle,
    chips: fitChips(keysOf(summary.lessons)),
    session: '[learn]',
    current: `${level.n}:${level.slug}*`,
    meta: `${summary.count} tasks · ${summary.minutes} min · ${summary.keyCount} keys`,
  };
}

/** A category page on either hub. Both read the same catalogue. */
function categoryCard(kind: 'Guides' | 'Gallery', category: Category, count: number): OgCard {
  const noun = kind === 'Guides' ? 'guide' : 'config';
  return {
    eyebrow: kind,
    title: category.title,
    session: '[learn]',
    current: `${category.id}*`,
    meta: `${count} ${noun}${count === 1 ? '' : 's'}`,
  };
}

/** A guide with no cover of its own. One with a cover unfurls as the cover. */
function guideCard(guide: GuideEntry): OgCard {
  return {
    eyebrow: `Guide · ${guideCategory(guide.data.categories[0]).name}`,
    title: guide.data.title,
    session: '[learn]',
    current: `${guide.id}*`,
    meta: readingTime(guide.body ?? '').label,
  };
}

/** Every card the site has, page by page. */
export async function ogTargets(): Promise<OgTarget[]> {
  const [lessons, summaries, stats, guides, configs, sections] = await Promise.all([
    getLessons(),
    getLevelSummaries(),
    getCourseStats(),
    getGuides(),
    getConfigs(),
    getCheatSheetSections(),
  ]);

  const guideTally = guideCategoryTally(guides);
  const configTally = configCategoryTally(configs);

  return [
    ...lessons.map((lesson, index) =>
      target(
        lessonPath(lesson),
        lessonCard(
          lesson,
          index + 1,
          lessons.length,
          `Level ${lesson.data.level} · ${summaries[lesson.data.level - 1].level.name}`,
        ),
      ),
    ),

    ...summaries.map((summary) => target(levelPath(summary.level), levelCard(summary))),

    target('/cheatsheet', {
      eyebrow: 'Reference',
      title: 'The tmux cheat sheet',
      // One key from each level rather than the first three rows, which are all
      // level 1 and would draw the same chips as the Basics card.
      chips: fitChips(
        sections.flatMap((section) => (section.rows[0] ? [section.rows[0].key] : [])),
        4,
      ),
      session: '[learn]',
      current: 'cheatsheet*',
      meta: `${stats.keys} keys · every one linked to its task`,
    }),

    target('/playground', {
      eyebrow: 'Playground',
      title: 'Try tmux in your browser',
      accent: 'a real tmux · nothing graded',
      session: '[learn]',
      current: 'playground*',
      meta: 'nothing to install · no account',
    }),

    target('/guides', {
      eyebrow: 'Guides',
      title: 'Practical tmux guides',
      chips: fitChips(guideTally.map(({ category }) => category.name)),
      session: '[learn]',
      current: 'guides*',
      meta: `${guides.length} guide${guides.length === 1 ? '' : 's'}`,
    }),

    ...guideTally.map(({ category, count }) =>
      target(guideCategoryPath(category.id), categoryCard('Guides', category, count)),
    ),

    // Only the ones with nothing of their own to show.
    ...guides
      .filter((guide) => !guide.data.cover)
      .map((guide) => target(guidePath(guide), guideCard(guide))),

    target('/gallery', {
      eyebrow: 'Gallery',
      title: 'A gallery of real tmux configs',
      chips: fitChips(configTally.map(({ category }) => category.name)),
      session: '[learn]',
      current: 'gallery*',
      meta: `${configs.length} config${configs.length === 1 ? '' : 's'}, with the file behind each`,
    }),

    ...configTally.map(({ category, count }) =>
      target(configCategoryPath(category.id), categoryCard('Gallery', category, count)),
    ),
  ];
}

/**
 * The card for one page, or nothing if the page has none.
 *
 * Memoised: every page in the build asks this once through Seo.astro, and the
 * answer is the same list every time.
 */
let index: Promise<Map<string, OgTarget>> | undefined;

export async function ogTargetFor(page: string): Promise<OgTarget | undefined> {
  index ??= ogTargets().then(
    (targets) => new Map(targets.map((entry) => [canonicalPath(entry.page), entry])),
  );
  return (await index).get(canonicalPath(page));
}
