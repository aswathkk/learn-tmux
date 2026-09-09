/**
 * Whether the machine is allowed to start itself, and when.
 *
 * The gate exists because 15 MB and an x86 CPU on the main thread is not
 * something to spend on someone who came to read. That reasoning was never an
 * argument for a button — it was an argument against starting the machine
 * *during page load*. Someone who has landed on a lesson, or on the playground,
 * wants the terminal; making them ask for it is a click that buys nothing, and
 * the click is also the moment the 15 MB starts, so it costs a wait as well.
 *
 * So the machine starts on its own, but only once every metric that could be
 * hurt has already been recorded, and only on a client that can afford it:
 *
 *   - after `load`, so the fetch never competes with the critical path and is
 *     not attributed to LCP or to the load event itself;
 *   - at idle, so the emulator's chunk is parsed in time the main thread was
 *     going to spend doing nothing;
 *   - only when the terminal is actually on screen and the tab is actually
 *     being looked at, so a background tab never spends the bytes;
 *   - never on a metered, slow, small or automated client — those keep the
 *     button, which still works exactly as it did.
 *
 * SEO is handled a layer down and not here: /vm/ is disallowed in robots.txt,
 * so a crawler that renders one of these pages skips the guest entirely. The
 * lesson, the steps, the checks, the hints and the playground's key reference
 * are static HTML and do not depend on any of this running.
 */

import { hasStoredSnapshot } from './snapshot-cache';

/** Not in lib.dom: both are widely shipped but neither is on a standards track. */
interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

interface CapabilityHints {
  connection?: NetworkInformation;
  deviceMemory?: number;
}

/**
 * Whether this client should have the machine started for it.
 *
 * Every `false` here leaves the learner with the button, so a wrong guess is a
 * click, never a missing terminal.
 *
 * Asynchronous only because of the last question it asks: whether the snapshot
 * is already in this browser. That is a real lookup in the Cache API rather
 * than a flag we set and hope is still true — a stored copy can be evicted
 * under storage pressure, and believing a stale flag would spend 12.5 MB on a
 * connection the check exists to protect.
 */
export async function mayAutoStart(): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof matchMedia !== 'function') return false;

  // Headless Chrome under Lighthouse, WebPageTest and anything driving the page
  // through WebDriver. A synthetic run should measure the page, not the guest.
  if (navigator.webdriver) return false;

  // Two ways of saying the same thing, and both are explicit requests.
  if (matchMedia('(prefers-reduced-data: reduce)').matches) return false;
  const { connection, deviceMemory } = navigator as Navigator & CapabilityHints;
  if (connection?.saveData) return false;

  // Below the lg breakpoint the columns stack and the machine is on a phone:
  // mobile is what Google indexes and ranks on, an x86 CPU on a phone's main
  // thread is the worst version of this trade, and the bytes are likely
  // someone's cellular data. Phones ask.
  if (matchMedia('(max-width: 1023px)').matches) return false;

  // The emulator is a single-threaded interpreter with an xterm renderer beside
  // it, so cores and RAM are the two things that decide whether the page stays
  // responsive while it runs.
  if (typeof deviceMemory === 'number' && deviceMemory < 4) return false;
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2) {
    return false;
  }

  // A machine already in this browser costs a conditional request, not 15 MB,
  // so the link is only worth judging when the bytes are really going to move.
  if (connection?.effectiveType && /^(slow-)?2g$|^3g$/.test(connection.effectiveType)) {
    if (!(await hasStoredSnapshot())) return false;
  }

  return true;
}

/**
 * Run `start` at the first moment that costs nothing: page loaded, terminal on
 * screen, tab in front, main thread idle.
 *
 * Returns a canceller, which the caller uses the instant the learner presses
 * Start themselves — otherwise a second, later call would arrive against a
 * machine that is already booting.
 */
export function scheduleAutoStart(target: Element, start: () => void): () => void {
  let cancelled = false;
  let observer: IntersectionObserver | null = null;

  /** Drop the listeners. Says nothing about whether the start still happens. */
  const detach = (): void => {
    observer?.disconnect();
    observer = null;
    document.removeEventListener('visibilitychange', onVisible);
  };

  const cancel = (): void => {
    cancelled = true;
    detach();
  };

  /**
   * The last gate, and the reason cancelling is more than dropping listeners:
   * by the time the idle callback runs, the learner may have pressed Start
   * themselves and cancelled this. Firing anyway would be a second boot request
   * against a machine already on its way.
   */
  const run = (): void => {
    if (!cancelled) start();
  };

  /**
   * The idle callback has a timeout because a page that never goes idle is
   * exactly a page where the learner is waiting on us; `setTimeout` covers
   * Safari, which still ships no requestIdleCallback.
   */
  const fire = (): void => {
    if (cancelled) return;
    detach();
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 200);
  };

  function onVisible(): void {
    if (document.visibilityState === 'visible') fire();
  }

  const whenVisible = (): void => {
    if (cancelled) return;
    if (document.visibilityState === 'visible') fire();
    else document.addEventListener('visibilitychange', onVisible);
  };

  const observe = (): void => {
    if (cancelled) return;
    if (typeof IntersectionObserver !== 'function') {
      whenVisible();
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) whenVisible();
      },
      // Slightly ahead of the fold: on the stacked layout the terminal is the
      // first thing under the header, and waiting for a pixel of it is a wait
      // for nothing.
      { rootMargin: '200px' },
    );
    observer.observe(target);
  };

  // `load` and not DOMContentLoaded: the point is to be after the fonts, the
  // images and the load event, not merely after parsing.
  if (document.readyState === 'complete') observe();
  else window.addEventListener('load', observe, { once: true });

  return cancel;
}
