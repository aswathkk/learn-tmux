/**
 * The guides feed.
 *
 * Guides only: lessons are an interactive course, and pushing 42 of them into a
 * feed would bury the thing a subscriber actually wants to hear about.
 */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
  const guides = (await getCollection('guides', ({ data }) => !data.draft)).sort(
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
      categories: [guide.data.category],
    })),
    customData: '<language>en</language>',
  });
}
