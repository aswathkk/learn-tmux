/**
 * The lesson contract.
 *
 * This is the single source of truth for what a lesson is. `src/content.config.ts`
 * validates every .md file against it at build time, and the browser-side harness
 * consumes the same types at runtime, so a lesson that builds is a lesson the
 * harness can run.
 *
 * The shapes mirror the frontmatter written by hand in src/content/lessons.
 */
import { z } from 'astro/zod';

/**
 * A check is one line of the "Done when" list.
 *
 * `command` runs on the guest's control channel (its second serial port), never
 * in the terminal the learner is using. `kind: 'tmux'` commands are prefixed
 * with `tmux` before they run; `kind: 'shell'` commands run as written.
 * `expect` is a JavaScript regular expression matched against the trimmed
 * output, compiled multiline: `^` and `$` bracket a line of it, not the whole
 * block, because most checks read one line out of a list.
 */
export const checkSchema = z.object({
  id: z.string(),
  description: z.string(),
  kind: z.enum(['tmux', 'shell']),
  command: z.string(),
  /** Compiled with `new RegExp(pattern, 'm')` in the browser, so it must be valid there. */
  expect: z
    .string()
    .refine(
      (pattern) => {
        try {
          new RegExp(pattern);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'expect must be a valid JavaScript regular expression' },
    ),
});

/** One key binding taught by a lesson. These accumulate into the cheat sheet. */
export const keySchema = z.object({
  key: z.string(),
  command: z.string(),
  description: z.string(),
});

export const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

export const lessonSchema = z.object({
  title: z.string().max(60),
  /** URL segment. Keyword-bearing, stable: changing it breaks an indexed URL. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be lowercase words joined by hyphens'),
  /** The blurb on the level index and under a guide's "learn this first" links. */
  summary: z.string().max(155),
  /**
   * The meta description, and only that.
   *
   * `summary` used to do this job as well, and it is the wrong shape for it: it
   * is written for someone already on the level page, who has the title above
   * it and the rest of the course around it, so it can be eight words long and
   * name no keys. A search result has none of that context. This sentence
   * names the keys and commands the lesson teaches — the words someone types
   * into the search box — and fills the width Google prints.
   *
   * The floor is as load-bearing as the ceiling: a 60-character description
   * gives up two thirds of the only copy the site controls on the results page.
   */
  seoDescription: z.string().min(110).max(155),
  level: z.number().int().min(1).max(4),
  /**
   * Position within the level. NOT contiguous: level 3 jumps from 7 to 10
   * because two lessons needed tmux 3.7/3.8 and the guest ships 3.4. Order by
   * this number, but never use it as "task N of M" — use the index in the
   * sorted list for that.
   */
  task: z.number().int().positive(),
  difficulty: z.enum(difficulties),
  estimatedMinutes: z.number().int().positive(),
  concepts: z.array(z.string()),
  keys: z.array(keySchema),
  /** Sections of the official tmux wiki this lesson is drawn from. */
  wikiSections: z.array(z.string()),
  /** Challenges state an end state instead of steps, and teach no new keys. */
  challenge: z.boolean(),
  objective: z.string(),
  /** Commands run on the control channel to stage the machine before the learner sees it. */
  setup: z.array(z.string()),
  /** Typed into the learner's visible terminal after setup. Absent for lessons that start at a bare shell. */
  startCommand: z.string().optional(),
  checks: z.array(checkSchema),
  hints: z.array(z.string()),
});

export type Check = z.infer<typeof checkSchema>;
export type LessonKey = z.infer<typeof keySchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Difficulty = (typeof difficulties)[number];

/**
 * What the page hands to the harness: everything needed to stage and grade the
 * machine, and nothing else. Prose is already rendered into the HTML.
 */
export interface LessonSpec {
  id: string;
  setup: string[];
  startCommand?: string;
  checks: Check[];
}
