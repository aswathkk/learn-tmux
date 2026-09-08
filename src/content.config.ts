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

const lessons = defineCollection({
  loader: glob({ pattern: 'level-*/task-*.md', base: './src/content/lessons' }),
  schema: lessonSchema,
});

const guideCategories = ['setup', 'workflow', 'config', 'remote'] as const;

/**
 * What a category is called on the page.
 *
 * The index used to keep its own copy of this map while the guide template
 * printed the raw enum, so the same article was filed under "Configuration" in
 * one place and "CONFIG" in the other. One map, next to the enum it names, and
 * typed against it: adding a category to `guideCategories` is a type error
 * until it has a label here.
 */
export const guideCategoryNames: Record<GuideCategory, string> = {
  setup: 'Setup',
  workflow: 'Workflow',
  config: 'Configuration',
  remote: 'Remote',
};

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().max(65),
    /** Meta description. Capped where Google truncates. */
    description: z.string().max(155),
    /** Overrides <title> when the display title is too short to rank on its own. */
    seoTitle: z.string().max(65).optional(),
    category: z.enum(guideCategories),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Pulled to the top of the guides index, ahead of the newest guide. */
    featured: z.boolean().default(false),
    /** Lesson slugs this guide builds on, rendered as "learn this first" links. */
    relatedLessons: z.array(z.string()).default([]),
    /** Other guides to read next, in the order they should be offered. */
    relatedGuides: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const configs = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/configs' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(65),
      description: z.string().max(155),
      author: z.string(),
      authorUrl: z.string().url().optional(),
      /** Where the config itself lives, if it is published. */
      repo: z.string().url().optional(),
      screenshot: image(),
      /** Short, searchable traits: "minimal", "powerline", "catppuccin", "vim-keys". */
      tags: z.array(z.string()).default([]),
      /** tmux version the config was written against. */
      tmuxVersion: z.string().optional(),
      added: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { lessons, guides, configs };
export type GuideCategory = (typeof guideCategories)[number];
