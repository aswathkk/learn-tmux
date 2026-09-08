/**
 * How long a guide takes to read.
 *
 * Prose and code are not read at the same speed, and these guides are roughly
 * half code, so counting every token as a word would badly overstate them. Code
 * is scanned rather than read: a config block is taken in a line at a time, and
 * often skipped entirely on a first pass.
 *
 * So the two are counted separately — prose at a reading pace, fenced code at a
 * scanning pace — and added together.
 */

/** Words per minute for ordinary prose. The usual figure for adult reading. */
const PROSE_WPM = 200;

/** Lines per minute for fenced code, which is scanned rather than read. */
const CODE_LPM = 20;

export interface ReadingTime {
  minutes: number;
  /** "6 min read" */
  label: string;
}

/**
 * Estimate reading time from raw markdown.
 *
 * Frontmatter is not counted: it never reaches the page.
 */
export function readingTime(markdown: string): ReadingTime {
  const withoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');

  const codeBlocks: string[] = [];
  const prose = withoutFrontmatter.replace(/```[\s\S]*?```/g, (block) => {
    codeBlocks.push(block);
    return ' ';
  });

  const proseWords = prose.split(/\s+/).filter(Boolean).length;
  const codeLines = codeBlocks.reduce(
    (total, block) => total + block.split('\n').filter((line) => line.trim()).length,
    0,
  );

  const minutes = Math.max(1, Math.round(proseWords / PROSE_WPM + codeLines / CODE_LPM));
  return { minutes, label: `${minutes} min read` };
}
