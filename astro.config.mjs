// @ts-check
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { buildContentIndex } from './scripts/content-index.mjs';

const site = 'https://learntmux.dev';

/**
 * Lesson slugs and authored publication dates, gathered once so the sitemap's
 * `serialize` hook stays cheap. Dates come from frontmatter, never from git:
 * see scripts/content-index.mjs.
 */
const { lessonSlugs, datesBySlug } = buildContentIndex();

/**
 * Drop the guest machine from the build output.
 *
 * public/vm/ has to sit in public/ so `astro dev` serves it, but in production
 * /vm/* is a Pages Function reading from R2 (functions/vm/[[path]].ts), and a
 * Function takes precedence over a static asset at the same path. Copying the
 * files anyway would upload 22 MB per deploy that nothing can ever reach.
 *
 * The escape hatch is for `astro preview`, which serves dist/ and so has no
 * guest without them: KEEP_VM_ASSETS=1 bun run build.
 *
 * @returns {import('astro').AstroIntegration}
 */
function dropGuestAssets() {
  return {
    name: 'learntmux:drop-guest-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (process.env.KEEP_VM_ASSETS) {
          logger.info('keeping vm/ in the build output (KEEP_VM_ASSETS)');
          return;
        }
        await rm(fileURLToPath(new URL('vm/', dir)), { recursive: true, force: true });
        logger.info('dropped vm/ from the build output; /vm/* is served from R2');
      },
    },
  };
}

/**
 * The date the author gave the page behind a URL, or undefined if it has none.
 *
 * Keyed on the last URL segment, which is unique across the site: lesson slugs
 * are unique across the whole course, and guides and gallery entries are named
 * by their file or directory.
 *
 * @param {string} url
 * @returns {Date | undefined}
 */
function lastmodFor(url) {
  const last = new URL(url).pathname.split('/').filter(Boolean).at(-1);
  return last ? datesBySlug.get(last) : undefined;
}

export default defineConfig({
  site,

  // One canonical shape for every URL: no trailing slash. Two URLs that both
  // return 200 for the same page is duplicate content, so the slashless form is
  // the only one the site ever links to or declares as canonical.
  //
  // `format: 'file'` writes /basics.html rather than /basics/index.html, so a
  // directory-style URL never exists to be served in the first place.
  trailingSlash: 'never',
  build: { format: 'file' },

  // Self-hosted at build time: no Google Fonts round trip, no render-blocking
  // stylesheet on a third-party origin.
  //
  // The cssVariable names deliberately differ from the --font-sans/--font-mono
  // tokens in global.css. Astro registers @font-face rules under the real family
  // names, so the existing font stacks pick the local files up on their own, and
  // nothing here overwrites a brand token.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      // Instrument Sans is variable. One range fetches a single file that
      // covers 400-700, rather than four static instances — and `preload` then
      // puts one request in the critical path instead of four.
      weights: ['400 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      // Variable too. 400 for terminal and meta text, 600 for the wordmark.
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
  ],

  // Shiki ships github-dark by default, which put GitHub's blues and purples
  // into every config block on the site and forced a background !important in
  // global.css to fight it. `css-variables` hands the palette back to the
  // stylesheet, so code is coloured from the same tokens as everything else.
  markdown: {
    shikiConfig: { theme: 'css-variables', wrap: false },
  },

  integrations: [
    dropGuestAssets(),
    sitemap({
      // Anything thin or duplicated is noindex in the page head, so it must not
      // be advertised here either. The playground used to be in that bucket and
      // is not any more: it is the page someone searching for "tmux online"
      // wants, and it now carries the copy to earn the visit.
      //
      // /og/*.png is the other exclusion: those routes are images a crawler
      // reaches through a page's og:image, not pages anyone can land on.
      filter: (page) => !/\/complete$/.test(page) && !/\/og\/.+\.png$/.test(page),
      serialize: (item) => {
        const path = new URL(item.url).pathname;
        const segments = path.split('/').filter(Boolean);
        const last = segments.at(-1);

        // Lessons are the pages worth crawling most often; the landing page and
        // the level hubs change with them. Levels are identified by their
        // lessons rather than by a hardcoded list of slugs.
        if (path === '/') item.priority = 1.0;
        else if (last && lessonSlugs.has(last)) item.priority = 0.8;
        // The playground and the cheat sheet are the two pages people arrive at
        // without wanting the course, so they rank with the lessons rather than
        // with the hubs.
        else if (last === 'playground' || last === 'cheatsheet') item.priority = 0.8;
        else if (
          segments.length === 1 &&
          last &&
          !['guides', 'cheatsheet', 'gallery', 'playground'].includes(last)
        )
          item.priority = 0.7;
        else item.priority = 0.6;

        const date = lastmodFor(item.url);
        if (date) item.lastmod = date.toISOString();
        return item;
      },
    }),
  ],

  vite: { plugins: [tailwindcss()] },
});
