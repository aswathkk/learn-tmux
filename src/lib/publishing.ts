/**
 * What "draft" means.
 *
 * `draft: true` keeps an entry out of the site completely: no page, no row on
 * an index, no chip, no RSS item, no sitemap entry, no "read next" link from a
 * published guide. Nothing links to it and nothing lists it, which is the only
 * version of the feature worth having — a draft that is merely hidden from one
 * index is still a live URL for anyone who guesses it.
 *
 * That holds on a dev server too, so what you are reading at localhost is the
 * site as it will ship. To read a draft in place, ask for it:
 *
 *   SHOW_DRAFTS=1 bun run dev
 *
 * Drafts then render, marked with a badge and carrying `noindex` in case the
 * dev server is ever exposed.
 *
 * The switch cannot be thrown in a build. import.meta.env.PROD is true for
 * `astro build` and false for `astro dev`, so a stray SHOW_DRAFTS in a CI
 * environment cannot publish a draft, and `astro preview` — which serves the
 * build output — has none to show.
 */

/** The env var read at build time, not in the browser. */
const requested =
  typeof process !== 'undefined' && process.env?.SHOW_DRAFTS !== undefined
    ? process.env.SHOW_DRAFTS !== '' && process.env.SHOW_DRAFTS !== '0'
    : false;

/** True only under `SHOW_DRAFTS=1 astro dev`. */
export const draftsVisible = !import.meta.env.PROD && requested;

/** The predicate every getCollection call for guides and configs filters on. */
export function isPublished(entry: { data: { draft: boolean } }): boolean {
  return draftsVisible || !entry.data.draft;
}
