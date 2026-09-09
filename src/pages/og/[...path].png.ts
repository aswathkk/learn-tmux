/**
 * Every social card the site draws, at the page path it belongs to:
 * /basics/zoom-a-pane is drawn at /og/basics/zoom-a-pane.png.
 *
 * The list is src/lib/og-cards.ts, so this file is only the plumbing — a route
 * that never has to be edited when a page is added.
 *
 * Every byte is written at build time. Nothing here runs on a request.
 */
import type { APIContext, GetStaticPaths } from 'astro';
import { ogTargets, type OgTarget } from '../../lib/og-cards';
import { renderCard } from '../../lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const targets = await ogTargets();
  return targets.map((target: OgTarget) => ({
    // The route's own /og prefix and .png suffix, so the parameter is the page.
    params: { path: target.page.replace(/^\//, '') },
    props: { target },
  }));
};

export async function GET({ props }: APIContext): Promise<Response> {
  const { target } = props as { target: OgTarget };

  // No Cache-Control here: this response is written to a file, and Pages serves
  // the file under the rules in public/_headers. A header set here would only
  // ever be seen by `astro dev`.
  return new Response(new Uint8Array(await renderCard(target.card)), {
    headers: { 'Content-Type': 'image/png' },
  });
}
