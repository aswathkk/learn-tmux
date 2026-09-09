/**
 * The guides feed.
 *
 * Guides only: lessons are an interactive course, and pushing 42 of them into a
 * feed would bury the thing a subscriber actually wants to hear about.
 *
 * `getGuides` applies the draft rule, so a draft is never in the feed even
 * while it is readable on a dev server: a feed item is the one thing a reader
 * cannot be un-shown.
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getGuides } from '../lib/guides';
import { guideCategory } from '../lib/taxonomy';

export async function GET(context: APIContext): Promise<Response> {
  const guides = (await getGuides()).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );

  return rss({
    title: 'learntmux guides',
    description: 'Practical tmux guides: config, workflows, and keeping remote sessions alive.',
    site: context.site ?? 'https://learntmux.dev',
    trailingSlash: true,
    items: guides.map((guide) => ({
      title: guide.data.title,
      description: guide.data.description,
      pubDate: guide.data.published,
      link: `/guides/${guide.id}/`,
      // Every category the guide carries, under the name a reader would see.
      categories: guide.data.categories.map((id) => guideCategory(id).name),
    })),
    customData: '<language>en</language>',
  });
}
