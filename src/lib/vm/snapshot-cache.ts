/**
 * Where the boot snapshot is kept, and whether it is already there.
 *
 * Split out of snapshot.ts for one reason: the lesson page's eager script asks
 * this question before deciding whether to start the machine unprompted, and
 * importing it from snapshot.ts pulled that whole module — the fetch, the
 * revalidation, the progress reader, the store — into the eager chunk, where it
 * would have been downloaded by every reader who never starts a terminal. The
 * two constants and the lookup are all the decision needs.
 */

/** Bump to invalidate every stored snapshot at once. Older caches are swept on open. */
export const CACHE_NAME = 'learntmux-vm-v1';

/**
 * Where the snapshot lives.
 *
 * Named here rather than beside the other guest URLs in machine.ts because the
 * cache key is this string: anything asking whether a snapshot is already
 * stored has to ask about the exact URL the store was written under, and two
 * copies of that would drift.
 */
export const SNAPSHOT_URL = '/vm/state.bin.zst';

/**
 * Whether the 12.5 MB snapshot is already sitting in this browser.
 *
 * The answer is what separates a first visit from a second one. It is not a
 * promise that no bytes will move — the loader still revalidates, and the
 * server can still answer 200 — but it is the difference between a machine that
 * costs a conditional request and one that costs 12.5 MB, which is the whole
 * question a decision to start unprompted turns on.
 *
 * `caches.has` would answer for the cache rather than for what is in it: the
 * sweep in snapshot.ts creates the current cache on any visit at all.
 */
export async function hasStoredSnapshot(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(SNAPSHOT_URL)) !== undefined;
  } catch {
    return false;
  }
}
