/**
 * Everything derived from the lessons collection: ordering, routes, navigation
 * and course totals.
 *
 * One rule runs through this file: task numbers have gaps. Level 3 goes
 * 1..7 then 10, because two lessons needed tmux 3.7 and 3.8 and the guest ships
 * 3.4. So `task` orders lessons and nothing else — every "task N of M" comes
 * from a lesson's index in the sorted list.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { getLevel, levels, type Level } from './levels';

export type LessonEntry = CollectionEntry<'lessons'>;

/** Ascending by level, then by task number. The canonical order of the course. */
export function byCourseOrder(a: LessonEntry, b: LessonEntry): number {
  return a.data.level - b.data.level || a.data.task - b.data.task;
}

export async function getLessons(): Promise<LessonEntry[]> {
  const lessons = await getCollection('lessons');
  return lessons.sort(byCourseOrder);
}

export async function getLessonsByLevel(n: number): Promise<LessonEntry[]> {
  const lessons = await getLessons();
  return lessons.filter((lesson) => lesson.data.level === n);
}

/**
 * /basics/detach-and-reattach
 *
 * No `/learn` prefix and no trailing slash: the level slug is the top-level
 * segment, and the canonical form of every URL on the site is slashless.
 */
export function lessonPath(lesson: LessonEntry): string {
  return `/${getLevel(lesson.data.level).slug}/${lesson.data.slug}`;
}

/** /basics */
export function levelPath(level: Level | number): string {
  const resolved = typeof level === 'number' ? getLevel(level) : level;
  return `/${resolved.slug}`;
}

export interface LessonContext {
  lesson: LessonEntry;
  level: Level;
  /** 1-based position within the level, ignoring gaps in task numbers. */
  position: number;
  /** How many lessons the level actually has. */
  totalInLevel: number;
  /** 1-based position across the whole course. */
  coursePosition: number;
  totalInCourse: number;
  previous?: LessonEntry;
  next?: LessonEntry;
  /** First lesson of the following level, for the end of a level. */
  nextLevel?: Level;
}

/**
 * Position, totals and neighbours for one lesson. `next` runs across level
 * boundaries so the last lesson of a level still points somewhere.
 */
export async function getLessonContext(lesson: LessonEntry): Promise<LessonContext> {
  const all = await getLessons();
  const inLevel = all.filter((candidate) => candidate.data.level === lesson.data.level);

  const position = inLevel.findIndex((candidate) => candidate.id === lesson.id) + 1;
  const courseIndex = all.findIndex((candidate) => candidate.id === lesson.id);

  return {
    lesson,
    level: getLevel(lesson.data.level),
    position,
    totalInLevel: inLevel.length,
    coursePosition: courseIndex + 1,
    totalInCourse: all.length,
    previous: all[courseIndex - 1],
    next: all[courseIndex + 1],
    nextLevel: levels.find((level) => level.n === lesson.data.level + 1),
  };
}

export interface LevelSummary {
  level: Level;
  lessons: LessonEntry[];
  count: number;
  minutes: number;
  /** The distinct key bindings introduced in this level. */
  keyCount: number;
  challenge?: LessonEntry;
}

/** Per-level counts for the levels grid and the level hubs. */
export async function getLevelSummaries(): Promise<LevelSummary[]> {
  const all = await getLessons();
  return levels.map((level) => {
    const lessons = all.filter((lesson) => lesson.data.level === level.n);
    const keys = new Set(lessons.flatMap((lesson) => lesson.data.keys.map((key) => key.key)));
    return {
      level,
      lessons,
      count: lessons.length,
      minutes: lessons.reduce((total, lesson) => total + lesson.data.estimatedMinutes, 0),
      keyCount: keys.size,
      challenge: lessons.find((lesson) => lesson.data.challenge),
    };
  });
}

export interface CourseStats {
  lessons: number;
  levels: number;
  minutes: number;
  keys: number;
  checks: number;
}

/** Totals for the landing page and the Course JSON-LD. Never hardcode these. */
export async function getCourseStats(): Promise<CourseStats> {
  const all = await getLessons();
  const keys = new Set(all.flatMap((lesson) => lesson.data.keys.map((key) => key.key)));
  return {
    lessons: all.length,
    levels: levels.length,
    minutes: all.reduce((total, lesson) => total + lesson.data.estimatedMinutes, 0),
    keys: keys.size,
    checks: all.reduce((total, lesson) => total + lesson.data.checks.length, 0),
  };
}

/** ISO 8601 duration, e.g. PT2H10M. Used by the Course JSON-LD. */
export function isoDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `PT${hours ? `${hours}H` : ''}${rest ? `${rest}M` : ''}` || 'PT0M';
}
