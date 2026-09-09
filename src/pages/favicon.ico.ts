/**
 * /favicon.ico — the root icon a client asks for when the page declares none.
 *
 * Drawn from public/favicon.svg at build time (src/lib/favicon.ts), so it is
 * never a second copy of the mark that can fall out of date.
 */
import { renderIco } from '../lib/favicon';

export async function GET(): Promise<Response> {
  // No Cache-Control: this is written to a file and served by Pages under the
  // rules in public/_headers, like the social cards.
  return new Response(new Uint8Array(await renderIco()), {
    headers: { 'Content-Type': 'image/x-icon' },
  });
}
