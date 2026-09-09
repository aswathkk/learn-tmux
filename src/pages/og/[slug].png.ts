/**
 * One social card per lesson, at /og/<slug>.png.
 *
 * Keyed on the lesson slug alone rather than on level and slug: slugs are
 * unique across the whole course, and a card whose URL does not carry the level
 * survives a lesson moving between levels — which the lesson's own URL does
 * not, but a card is not a page anyone links to.
 *
 * Every byte is written at build time. Nothing here runs on a request.
 */
import type { APIContext, GetStaticPaths } from 'astro';
import { getLessonContext, getLessons, type LessonEntry } from '../../lib/lessons';
import { lessonCard, renderCard } from '../../lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const lessons = await getLessons();
  return lessons.map((lesson: LessonEntry) => ({
    params: { slug: lesson.data.slug },
    props: { lesson },
  }));
};

export async function GET({ props }: APIContext): Promise<Response> {
  const { lesson } = props as { lesson: LessonEntry };
  const png = await renderCard(lessonCard(lesson, await getLessonContext(lesson)));

  // No Cache-Control here: this response is written to a file, and Pages serves
  // the file under the rules in public/_headers. A header set here would only
  // ever be seen by `astro dev`.
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
