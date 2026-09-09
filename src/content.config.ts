/**
 * Content collections.
 *
 * Three collections, all file-backed:
 *   lessons  — the 42 interactive tasks, validated against the harness contract
 *   guides   — every article: setup, workflows, config, remote
 *   configs  — the .tmux.conf gallery, one directory per entry
 *
 * There is deliberately no `cheatsheets` collection. Every cheat sheet row is
 * derived from the `keys` array of the lesson that teaches it (see
 * src/lib/cheatsheet.ts), so a row can never drift from its lesson and always
 * knows where to link back to.
 */
import { defineCollection } from 'astro:content';
// `z` from 'astro:content' is deprecated; astro/zod is the same instance and is
// also what src/lib/harness/types.ts imports, so both schemas share one zod.
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { lessonSchema } from './lib/harness/types';
import { configCategoryIds, guideCategoryIds } from './lib/taxonomy';

const lessons = defineCollection({
  loader: glob({ pattern: 'level-*/task-*.md', base: './src/content/lessons' }),
  schema: lessonSchema,
});

/**
 * `categories: [config, setup]`, or `categories: config` for the common case.
 *
 * An entry belongs to as many categories as it belongs to; the first one is the
 * primary, used wherever only one fits — the label on a row, the category in a
 * feed item. Duplicates are folded rather than rejected, because listing a
 * category twice says nothing different from listing it once.
 *
 * The catalogue itself is src/lib/taxonomy.ts, so adding a category there makes
 * it a legal value here without a second edit.
 */
/**
 * Who wrote it: a name, optionally a link and a face.
 *
 * One shape for both collections, because a byline is a byline — the gallery
 * credits the person whose config it is, a guide credits whoever wrote it, and
 * a reader should not meet two different arrangements of the same three facts.
 *
 * The avatar is a local image, resolved relative to the entry, so it is
 * processed and served like every other asset. A remote avatar URL would put a
 * third-party request on the page and go stale the day the account is renamed;
 * download the file into the repository instead.
 */
const authorSchema = <T extends z.ZodTypeAny>(image: () => T) =>
  z.object({
    name: z.string(),
    /** Their site, GitHub profile, or wherever they would rather be linked. */
    url: z.string().url().optional(),
    avatar: image().optional(),
  });

const categoryList = <Id extends string>(allowed: readonly [Id, ...Id[]]) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? [value] : value),
    z
      .array(z.enum(allowed))
      .nonempty('needs at least one category')
      .transform((list) => [...new Set(list)] as [Id, ...Id[]]),
  );

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(65),
      /** Meta description. Capped where Google truncates. */
      description: z.string().max(155),
      /** Overrides <title> when the display title is too short to rank on its own. */
      seoTitle: z.string().max(65).optional(),
      categories: categoryList(guideCategoryIds),
      /**
       * The image at the top of the guide, on its row on the index, and on the
       * card a link to it unfurls into. Optional: a guide with nothing worth
       * showing is better with no cover than with a stock one.
       */
      cover: image().optional(),
      /** What the cover shows, for a reader who cannot see it. */
      coverAlt: z.string().optional(),
      author: authorSchema(image).optional(),
      published: z.coerce.date(),
      updated: z.coerce.date().optional(),
      /** Pulled to the top of the guides index, ahead of the newest guide. */
      featured: z.boolean().default(false),
      /** Lesson slugs this guide builds on, rendered as "learn this first" links. */
      relatedLessons: z.array(z.string()).default([]),
      /** Other guides to read next, in the order they should be offered. */
      relatedGuides: z.array(z.string()).default([]),
      /** Kept out of the build entirely. See src/lib/publishing.ts. */
      draft: z.boolean().default(false),
    }),
});

const configs = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/configs' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(65),
      description: z.string().max(155),
      /** Whose config it is. Required: the gallery is other people's work. */
      author: authorSchema(image),
      /** Where the config itself lives, if it is published. */
      repo: z.string().url().optional(),
      /** The screenshot. Required — a gallery entry is its picture. */
      cover: image(),
      /**
       * What the screenshot shows. Defaults to naming the config, which is
       * true but says nothing; write one when the picture has a point.
       */
      coverAlt: z.string().optional(),
      /**
       * What kind of config this is. Browsable: every category is a page, and a
       * config that is both minimal and vim-keyed appears on both.
       */
      categories: categoryList(configCategoryIds),
      /** Short, searchable traits: "catppuccin", "vim-keys", "battery". */
      tags: z.array(z.string()).default([]),
      /** tmux version the config was written against. */
      tmuxVersion: z.string().optional(),
      added: z.coerce.date(),
      /** Kept out of the build entirely. See src/lib/publishing.ts. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { lessons, guides, configs };
