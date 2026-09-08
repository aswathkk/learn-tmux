/**
 * The guest machine, served out of R2.
 *
 * A boot pulls 97 files and about 15 MB, and none of it changes between
 * deploys of the site itself. Keeping it in the Pages build meant re-uploading
 * 22 MB to fix a typo in a lesson; keeping it here means `bun run guest:publish`
 * moves the machine and `bun run build` moves the site, independently.
 *
 * `_routes.json` sends only /vm/* through this function, so every other request
 * on the site is still served as a plain static asset.
 *
 * This function is the single source of truth for how the guest is cached and
 * typed. Nothing in `_headers` applies to a path a Pages Function owns, and the
 * metadata stored alongside the R2 objects is not consulted either — changing
 * policy here is a deploy, not a re-upload.
 */

interface Env {
  /** Bound in the Pages project settings: R2 bucket `learntmux`. */
  MY_BUCKET: R2Bucket;
}

/** A year, the longest max-age worth writing. */
const YEAR = 31_536_000;

/**
 * How long a given path may be reused without asking.
 *
 * Two classes, and the split is the whole point:
 *
 * `rootfs/` is content-addressed. copy-to-sha256.ts names every blob after a
 * sha256 prefix, so the bytes behind one of these URLs can never change. That
 * is 90 of the 97 files a boot touches, and pinning them is what stops a warm
 * visit from spending a conditional request — and a billed R2 read — per file.
 *
 * Everything else is one coupled generation. build.sh deletes and rewrites
 * rootfs/, guest:state re-snapshots against the result, and bumping
 * V86_VERSION replaces the emulator underneath both. A stale snapshot beside a
 * rebuilt rootfs is the failure guest/README.md warns about: the guest wakes
 * holding 9p inode numbers for files that no longer exist, and every blob it
 * asks for 404s. So these revalidate every load — deliberately not immutable,
 * and deliberately not stale-while-revalidate. It costs one round trip for
 * seven files, issued in parallel, and answers 304 rather than re-sending
 * 12.5 MB when the generation has not moved.
 */
function cacheControl(key: string): string {
  return key.startsWith('vm/rootfs/')
    ? `public, max-age=${YEAR}, immutable`
    : 'public, no-cache';
}

/**
 * The two headers that are about correctness rather than caching.
 *
 * `application/wasm` is what lets the browser compile v86 as it arrives; under
 * any other type it buffers all 2.1 MB first.
 *
 * The snapshot is zstd that libv86 inflates itself, chosen off the .zst
 * suffix. Content-Encoding must stay unset: with it the browser would inflate
 * the body in transit and hand libv86 a raw state under a name that makes it
 * try to inflate a second time. `octet-stream` is the type that keeps every
 * layer's hands off it.
 */
function contentType(key: string): string {
  if (key.endsWith('.wasm')) return 'application/wasm';
  if (key.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (key.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

export const onRequest: PagesFunction<Env> = async ({ request, params, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  // [[path]] hands back the matched segments; the bucket is keyed on the full
  // path so its layout mirrors public/vm/ one for one.
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const key = `vm/${segments.join('/')}`;

  // onlyIf turns the browser's If-None-Match into R2's problem. When it fails
  // the precondition, R2 returns the object's metadata with no body attached,
  // which is exactly a 304 — and the reason `no-cache` above is cheap rather
  // than a 12.5 MB re-download on every visit.
  const object = await env.MY_BUCKET.get(key, { onlyIf: request.headers });

  if (object === null) return new Response('Not found', { status: 404 });

  const headers = new Headers({
    'Content-Type': contentType(key),
    'Cache-Control': cacheControl(key),
    ETag: object.httpEtag,
    // The guest is served from the site's own origin, so this only matters if
    // /vm/* ever moves to a hostname of its own — at which point cross-origin
    // isolation would block it without this.
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Range is not advertised: v86 fetches whole files, and a 200 in answer to
    // a Range request is a legal response every client already handles.
    'Accept-Ranges': 'none',
  });

  // No body means the precondition failed. Only If-None-Match is ever sent
  // here, so that is a 304 rather than the 412 an If-Match failure would want.
  if (!('body' in object)) return new Response(null, { status: 304, headers });

  headers.set('Content-Length', String(object.size));

  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
};
