/**
 * /favicon-96x96.png — the PNG tab icon, for clients that take a raster icon
 * over the SVG. Same mark, same source; see src/lib/favicon.ts.
 */
import { PNG_SIZE, renderIcon } from '../lib/favicon';

export async function GET(): Promise<Response> {
  return new Response(new Uint8Array(await renderIcon(PNG_SIZE)), {
    headers: { 'Content-Type': 'image/png' },
  });
}
