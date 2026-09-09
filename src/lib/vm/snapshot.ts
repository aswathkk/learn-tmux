/**
 * The boot snapshot, held in the Cache API rather than the HTTP cache.
 *
 * state.bin.zst is 12.5 MB, and Chrome will not store a single HTTP cache entry
 * larger than roughly an eighth of that cache's quota. So the browser quietly
 * declined to keep it and re-downloaded all 12.5 MB on every visit, while the
 * 131 KB BIOS fetched beside it sat in the disk cache and v86.wasm answered 304.
 * No `Cache-Control` value can fix that: the response was never stored, so
 * there was nothing to revalidate. The Cache API is bound by origin storage
 * quota instead — orders of magnitude larger — and it is ours to invalidate.
 *
 * Freshness stays the contract the server states. The snapshot embeds 9p inode
 * metadata, so one served next to a rebuilt rootfs wakes the guest holding
 * inode numbers for files that no longer exist. Every load revalidates: we send
 * the stored ETag ourselves and keep the cached body only if the server answers
 * 304.
 */

/** Bump to invalidate every stored snapshot at once. Older caches are swept on open. */
const CACHE_NAME = 'learntmux-vm-v1';

/** Reports download progress as a fraction in [0, 1]. */
export type ProgressHandler = (fraction: number) => void;

/**
 * Fetch the snapshot, reusing the stored copy when the server says it is current.
 *
 * Always resolves to the bytes v86 needs, still zstd-compressed: `restore_state`
 * sniffs the zstd magic number off the buffer, so it decompresses a buffer and a
 * `.zst` URL alike.
 */
export async function loadSnapshot(url: string, onProgress?: ProgressHandler): Promise<ArrayBuffer> {
  const cache = await openCache();
  const cached = cache ? await cache.match(url).catch(() => undefined) : undefined;
  const etag = cached?.headers.get('ETag');

  let response: Response;
  try {
    response = await fetch(url, {
      // The browser cache is the thing that cannot hold this file, so it is cut
      // out entirely; the conditional request below is ours to make and ours to
      // read the answer to. Left to itself the browser would resolve the 304
      // against a cache entry that does not exist.
      cache: 'no-store',
      headers: etag ? { 'If-None-Match': etag } : undefined,
    });
  } catch (error) {
    // Offline holding a snapshot is a working machine; offline without one is not.
    if (cached) return cached.arrayBuffer();
    throw error;
  }

  if (response.status === 304 && cached) {
    onProgress?.(1);
    return cached.arrayBuffer();
  }

  if (!response.ok) {
    if (cached) return cached.arrayBuffer();
    throw new Error(`could not load the snapshot: ${response.status} ${response.statusText}`);
  }

  const buffer = await readWithProgress(response, onProgress);
  await store(cache, url, buffer, response.headers.get('ETag'));
  return buffer;
}

/**
 * The snapshot cache, or null where there is none to open.
 *
 * `caches` is absent on an insecure origin and throws outright in some private
 * browsing modes, so every caller treats storage as optional: without it the
 * machine still boots, it just pays for the download again next time.
 */
async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    void sweepOldCaches();
    return cache;
  } catch {
    return null;
  }
}

/** Drop snapshots left behind by an earlier CACHE_NAME, so a bump frees their space. */
async function sweepOldCaches(): Promise<void> {
  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('learntmux-vm-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name)),
    );
  } catch {
    // Nothing here is worth failing a boot over.
  }
}

/**
 * Drain the response, reporting progress as it arrives.
 *
 * v86's own `download-progress` events cover the files it fetches itself, and
 * the snapshot is no longer one of them — on the restore path this is the only
 * thing that moves the bar, and it is 98% of the bytes.
 */
async function readWithProgress(
  response: Response,
  onProgress?: ProgressHandler,
): Promise<ArrayBuffer> {
  const total = Number(response.headers.get('Content-Length')) || 0;
  const body = response.body;

  // Without a length there is no fraction to report, and without a stream there
  // is nothing to report it from. The bytes are still correct either way.
  if (!body || !onProgress || !total) return response.arrayBuffer();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    // Content-Length can disagree with what actually arrives; the bar must not
    // run past the end of its track.
    onProgress(Math.min(loaded / total, 1));
  }

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer.buffer;
}

/**
 * Keep the snapshot, tagged with the ETag the next load will revalidate against.
 *
 * Storing without one would leave nothing to send as If-None-Match, which turns
 * every later visit into an unconditional 12.5 MB download — worse than not
 * caching at all, because it also occupies the quota.
 */
async function store(
  cache: Cache | null,
  url: string,
  buffer: ArrayBuffer,
  etag: string | null,
): Promise<void> {
  if (!cache || !etag) return;
  try {
    await cache.put(url, new Response(buffer, { headers: { ETag: etag } }));
  } catch {
    // Over quota, or storage refused. The boot already has its bytes.
  }
}
