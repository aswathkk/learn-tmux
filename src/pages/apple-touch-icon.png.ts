/**
 * /apple-touch-icon.png — the icon iOS uses for a home-screen bookmark, and
 * the path it fetches from the root on its own. Same mark, drawn for iOS's
 * own mask; see src/lib/favicon.ts.
 */
import { renderAppleIcon } from '../lib/favicon';

export async function GET(): Promise<Response> {
  return new Response(new Uint8Array(await renderAppleIcon()), {
    headers: { 'Content-Type': 'image/png' },
  });
}
