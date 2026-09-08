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
  minutes: number;
  keyCount: number;
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
  minutes: number;
  /** The bindings this level adds to the cheat sheet. */
  keys: Array<{ key: string; description: string }>;
  keyCount: number;
  taskCount: number;
}

export interface LandingContent {
  stats: CourseStats;
  hours: string;
  levels: LandingLevel[];
  /** Where a first-time visitor starts. */
  startHref: string;
  completion: LandingCompletion;
  cheatSheet: {
    rows: CheatSheetRow[];
    total: number;
    /** How many are not shown in the preview. */
    remaining: number;
  };
}

/** "2h 52m", or "52m" under an hour. Used wherever the course length is quoted. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
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
    minutes: summary.minutes,
    keyCount: summary.keyCount,
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

  return {
    stats,
    hours: formatDuration(stats.minutes),
    levels,
    startHref: levels[0]?.startHref ?? '/',
    completion: {
      level: completionLevel.level,
      lessonTitle: finale.data.title,
      href: lessonPath(finale),
      minutes: completionLevel.minutes,
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
