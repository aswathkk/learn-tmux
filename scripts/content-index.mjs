/**
 * A small index of the content, for the sitemap.
 *
 * The sitemap integration only ever sees a URL, so anything it needs to know
 * about a page has to be gathered here, before the build. Two things are:
 *
 *   - which slugs are lessons, so a two-segment URL can be given a lesson's
 *     priority without hardcoding the level slugs as well;
 *   - when a page was published, for `lastmod`.
 *
 * Dates come from the frontmatter the author wrote, not from git history. A
 * commit date answers "when did this file last change", which is not the same
 * question: a typo fix would move it, a rebase or a squashed import would move
 * every page at once, and a shallow CI clone has no history to read at all.
 * `published` and `updated` are the dates someone actually meant.
 *
 * Only a few fields are needed, and only from the top of each file, so this
 * reads the frontmatter directly rather than pulling in a YAML parser that the
 * content pipeline is already going to run properly a moment later.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

/** The frontmatter block, or an empty string if the file has none. */
function frontmatter(source) {
  if (!source.startsWith('---')) return '';
  const end = source.indexOf('\n---', 3);
  return end === -1 ? '' : source.slice(3, end);
}

/**
 * Read a plain scalar field. Handles `key: value`, `key: "value"` and
 * `key: 'value'`; nested fields are deliberately not supported.
 */
function field(block, name) {
  const match = block.match(new RegExp(`^${name}: *["']?([^"'\\n]+)["']?\\s*$`, 'm'));
  return match ? match[1].trim() : undefined;
}

/** A frontmatter date, or undefined when absent or unparseable. */
function date(block, name) {
  const raw = field(block, name);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function read(path) {
  try {
    return frontmatter(readFileSync(path, 'utf8'));
  } catch {
    return '';
  }
}

function listDir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/**
 * @returns {{ lessonSlugs: Set<string>, datesBySlug: Map<string, Date> }}
 *   `datesBySlug` is keyed by the last segment of a page's URL.
 */
export function buildContentIndex(root = 'src/content') {
  const lessonSlugs = new Set();
  const datesBySlug = new Map();

  // Lessons: slug only. They carry no authored date, so they get no lastmod
  // rather than a fabricated one.
  const lessonsRoot = join(root, 'lessons');
  for (const level of listDir(lessonsRoot)) {
    const levelDir = join(lessonsRoot, level);
    if (!statSync(levelDir, { throwIfNoEntry: false })?.isDirectory()) continue;
    for (const file of listDir(levelDir)) {
      if (!file.endsWith('.md')) continue;
      const slug = field(read(join(levelDir, file)), 'slug');
      if (slug) lessonSlugs.add(slug);
    }
  }

  // Guides: `updated` if the author revised it, otherwise `published`.
  const guidesRoot = join(root, 'guides');
  for (const file of listDir(guidesRoot)) {
    if (!file.endsWith('.md')) continue;
    const block = read(join(guidesRoot, file));
    const when = date(block, 'updated') ?? date(block, 'published');
    if (when) datesBySlug.set(basename(file, '.md'), when);
  }

  // Config gallery entries: one directory each, dated by `added`.
  const configsRoot = join(root, 'configs');
  for (const dir of listDir(configsRoot)) {
    const when = date(read(join(configsRoot, dir, 'index.md')), 'added');
    if (when) datesBySlug.set(dir, when);
  }

  return { lessonSlugs, datesBySlug };
}
