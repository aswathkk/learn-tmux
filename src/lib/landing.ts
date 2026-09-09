/**
 * What the landing page says about the course, derived from the course.
 *
 * Every count, duration and key on the home page is read from the content at
 * build time. None of it is written by hand, so adding a lesson or renaming a
 * level changes the page with it and the two cannot disagree.
 */
import { getCheatSheetRows, type CheatSheetRow } from './cheatsheet';
import {
  getCourseStats,
  getLevelSummaries,
  lessonPath,
  levelPath,
  type CourseStats,
  type LessonEntry,
} from './lessons';
import type { Level } from './levels';

export interface LandingLevel {
  level: Level;
  /** Zero-padded for display: 01, 02, … */
  ordinal: string;
  href: string;
  count: number;
  keyCount: number;
  /**
   * Roughly how long one task in this level takes. The per-task figure is the
   * one the card shows: a level total reads as a commitment, and nobody has to
   * make one to start.
   */
  perTaskMinutes: number;
  /** The first few key bindings the level teaches, for the card. */
  keys: string[];
  /** Where the level starts. */
  startHref: string;
  /** Slugs of every lesson in the level, so the client can shade progress. */
  slugs: string[];
}

export interface LandingCompletion {
  level: Level;
  lessonTitle: string;
  href: string;
  perTaskMinutes: number;
  /** The bindings this level adds to the cheat sheet. */
  keys: Array<{ key: string; description: string }>;
  keyCount: number;
  taskCount: number;
}

/**
 * The one task a first-time visitor is being asked to do. Naming it, and how
 * long it takes, is the whole ask — the course total is not.
 *
 * The objective and the keys come with it so the page can show the task itself
 * rather than only promising one. Both are the lesson's own, so neither can
 * describe a task that is no longer there.
 */
export interface LandingFirstTask {
  title: string;
  minutes: number;
  href: string;
  /** The lesson's end state, as inline markdown. */
  objective: string;
  keys: Array<{ key: string; description: string }>;
}

export interface LandingContent {
  stats: CourseStats;
  levels: LandingLevel[];
  /** Where a first-time visitor starts. */
  startHref: string;
  firstTask: LandingFirstTask;
  completion: LandingCompletion;
  cheatSheet: {
    rows: CheatSheetRow[];
    total: number;
    /** How many are not shown in the preview. */
    remaining: number;
  };
}

/**
 * A challenge's title without its "Challenge:" prefix.
 *
 * Challenge lessons title themselves "Challenge: tidy a messy session", which
 * is right on the lesson page and doubles up wherever a label already says the
 * word — "Ends with a challenge: Challenge: tidy a messy session".
 */
function challengeTitle(title: string): string {
  return title.replace(/^challenge:\s*/i, '');
}

/** Minutes per task, rounded, never zero. Always quoted as an approximation. */
function perTask(minutes: number, count: number): number {
  if (count <= 0) return minutes;
  return Math.max(1, Math.round(minutes / count));
}

/** At most `limit` key bindings taught in this set of lessons, de-duplicated. */
function keysOf(lessons: LessonEntry[], limit: number): string[] {
  const seen: string[] = [];
  for (const lesson of lessons) {
    for (const entry of lesson.data.keys) {
      if (!seen.includes(entry.key)) seen.push(entry.key);
      if (seen.length === limit) return seen;
    }
  }
  return seen;
}

const CHEAT_SHEET_PREVIEW = 14;

export async function getLandingContent(): Promise<LandingContent> {
  const [stats, summaries, cheatRows] = await Promise.all([
    getCourseStats(),
    getLevelSummaries(),
    getCheatSheetRows(),
  ]);

  const levels: LandingLevel[] = summaries.map((summary) => ({
    level: summary.level,
    ordinal: String(summary.level.n).padStart(2, '0'),
    href: levelPath(summary.level),
    count: summary.count,
    keyCount: summary.keyCount,
    perTaskMinutes: perTask(summary.minutes, summary.count),
    keys: keysOf(summary.lessons, 5),
    startHref: summary.lessons[0] ? lessonPath(summary.lessons[0]) : levelPath(summary.level),
    slugs: summary.lessons.map((lesson) => lesson.data.slug),
  }));

  // The completion panel mirrors a real level ending: its challenge, and the
  // bindings that level banked.
  const completionLevel = summaries[1] ?? summaries[0];
  const finale =
    completionLevel.challenge ?? completionLevel.lessons[completionLevel.lessons.length - 1];
  const completionKeys = completionLevel.lessons
    .flatMap((lesson) => lesson.data.keys)
    .filter(
      (entry, index, all) => all.findIndex((other) => other.key === entry.key) === index,
    );

  const opener = summaries[0]?.lessons[0];

  return {
    stats,
    levels,
    startHref: levels[0]?.startHref ?? '/',
    firstTask: {
      title: opener?.data.title ?? 'Start your first session',
      minutes: opener?.data.estimatedMinutes ?? 3,
      href: opener ? lessonPath(opener) : (levels[0]?.startHref ?? '/'),
      objective: opener?.data.objective ?? '',
      keys: (opener?.data.keys ?? []).map((entry) => ({
        key: entry.key,
        description: entry.description,
      })),
    },
    completion: {
      level: completionLevel.level,
      lessonTitle: challengeTitle(finale.data.title),
      href: lessonPath(finale),
      perTaskMinutes: perTask(completionLevel.minutes, completionLevel.count),
      keys: completionKeys
        .slice(0, 6)
        .map((entry) => ({ key: entry.key, description: entry.description })),
      keyCount: completionLevel.keyCount,
      taskCount: completionLevel.count,
    },
    cheatSheet: {
      rows: cheatRows.slice(0, CHEAT_SHEET_PREVIEW),
      total: cheatRows.length,
      remaining: Math.max(0, cheatRows.length - CHEAT_SHEET_PREVIEW),
    },
  } satisfies LandingContent;
}
