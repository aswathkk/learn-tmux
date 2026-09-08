/**
 * The cheat sheet is derived, never authored.
 *
 * Every row comes from the `keys` array of the lesson that teaches it, so a row
 * cannot drift from its lesson and always knows where to link back to. That is
 * also what makes "only what you've actually done" possible on the client: the
 * page ships every row, and progress state hides the ones not yet earned.
 */
import { getLessons, lessonPath, type LessonEntry } from './lessons';
import { getLevel, type Level } from './levels';

export interface CheatSheetRow {
  /** The binding or command as typed, e.g. "C-b %" or "tmux new -s". */
  key: string;
  /** The tmux command it runs, e.g. "split-window -h". */
  command: string;
  description: string;
  level: Level;
  lessonTitle: string;
  lessonHref: string;
  /** Stable anchor so a lesson can deep-link to its own row. */
  anchor: string;
}

export interface CheatSheetSection {
  level: Level;
  rows: CheatSheetRow[];
}

/**
 * Punctuation that has no URL-safe spelling of its own.
 *
 * `-` is deliberately absent: it is already safe and reads better left alone,
 * so `C-b d` becomes `c-b-d` rather than `cdashb-d`.
 */
const PUNCTUATION_NAMES: Record<string, string> = {
  '%': 'percent',
  '"': 'quote',
  $: 'dollar',
  '&': 'ampersand',
  '{': 'brace-left',
  '}': 'brace-right',
  '[': 'bracket-left',
  ']': 'bracket-right',
  ':': 'colon',
  ',': 'comma',
  '?': 'question',
  '!': 'bang',
  '*': 'star',
  '=': 'equals',
  '.': 'dot',
  '#': 'hash',
  '~': 'tilde',
  ';': 'semicolon',
  "'": 'apostrophe',
  '<': 'angle-left',
  '>': 'angle-right',
  '/': 'slash',
  '|': 'pipe',
  '+': 'plus',
};

/**
 * Turn a key into a URL-safe anchor: "C-b %" -> "c-b-percent".
 *
 * Case carries meaning here. tmux binds `C-b d` to detach-client and `C-b D` to
 * choose-client — different commands — so a plain lowercase slug would give
 * both the same id and produce duplicate ids in the page. A lone uppercase
 * letter is therefore spelled out as the shifted key it is: `c-b-shift-d`.
 */
function toAnchor(key: string): string {
  const slug = key
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (/^[A-Z]$/.test(token)) return `shift-${token.toLowerCase()}`;
      return token
        .split('')
        .map((character) => PUNCTUATION_NAMES[character] ?? character)
        .join('')
        .toLowerCase();
    })
    .join('-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'key';
}

/**
 * Guarantee anchors are unique across the whole sheet.
 *
 * The transform above is injective for every key in the course today. This is
 * here so that a future key which happens to collide degrades into a numbered
 * anchor rather than silently emitting a duplicate id.
 */
function uniqueAnchor(anchor: string, taken: Set<string>): string {
  if (!taken.has(anchor)) {
    taken.add(anchor);
    return anchor;
  }
  let suffix = 2;
  while (taken.has(`${anchor}-${suffix}`)) suffix++;
  const unique = `${anchor}-${suffix}`;
  taken.add(unique);
  return unique;
}

/** Rows for one lesson, without anchors: those are assigned after de-duplication. */
function rowsFor(lesson: LessonEntry): Omit<CheatSheetRow, 'anchor'>[] {
  const level = getLevel(lesson.data.level);
  const href = lessonPath(lesson);
  return lesson.data.keys.map((entry) => ({
    key: entry.key,
    command: entry.command,
    description: entry.description,
    level,
    lessonTitle: lesson.data.title,
    lessonHref: href,
  }));
}

/**
 * Every row in course order, de-duplicated by key: a binding taught in level 1
 * and used again in level 3 belongs to level 1.
 */
export async function getCheatSheetRows(): Promise<CheatSheetRow[]> {
  const lessons = await getLessons();
  const seen = new Map<string, Omit<CheatSheetRow, 'anchor'>>();
  for (const lesson of lessons) {
    for (const row of rowsFor(lesson)) {
      if (!seen.has(row.key)) seen.set(row.key, row);
    }
  }

  // Anchors are assigned only to rows that actually render, so a key repeated
  // in a later lesson never consumes a name it will not use.
  const taken = new Set<string>();
  return [...seen.values()].map((row) => ({
    ...row,
    anchor: uniqueAnchor(toAnchor(row.key), taken),
  }));
}

/** The same rows, grouped into one section per level, in course order. */
export async function getCheatSheetSections(): Promise<CheatSheetSection[]> {
  const rows = await getCheatSheetRows();
  const sections = new Map<number, CheatSheetSection>();
  for (const row of rows) {
    const section = sections.get(row.level.n) ?? { level: row.level, rows: [] };
    section.rows.push(row);
    sections.set(row.level.n, section);
  }
  return [...sections.values()].sort((a, b) => a.level.n - b.level.n);
}
