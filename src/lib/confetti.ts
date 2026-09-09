/**
 * The burst that fires when a task is cleared.
 *
 * It is one canvas, created on the spot and thrown away when the last piece
 * leaves the viewport, so a page that never finishes a task never pays for it.
 * The chunk is deferred as well: the learn screen warms it when the machine
 * starts, which is a gesture that has already committed to 15 MB of emulator.
 *
 * The pieces are rectangles, not circles and not glyphs. A cell-shaped chip is
 * what a terminal is made of, and drawing them as rects means no font has to
 * load before the celebration can start — a webfont still in flight would have
 * spent the whole animation rendering in a fallback. Colours are read from the
 * ANSI palette in global.css so the burst cannot drift from the terminal it is
 * congratulating.
 *
 * They are thrown from the bottom two corners rather than from the "Done" chip
 * that announces the win. Aiming at the chip was the first shape and it was
 * wrong: the chip sits at the top of a narrow left column, so half of every
 * burst left the viewport in the first three frames and the rest never crossed
 * into the other two thirds of the page. Corners have no such problem, and they
 * do not move when the layout collapses to one column or the page is mid-scroll.
 *
 * Nobody who asked for less motion gets any of this: `prefers-reduced-motion`
 * makes fire() a no-op rather than a shortened version. A full-screen shower of
 * moving objects has no quiet variant worth showing.
 */

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Half-width and half-height, so drawing is symmetric about the centre. */
  w: number;
  h: number;
  colour: string;
  angle: number;
  spin: number;
  /** Phase of the flutter, which is what keeps a rect from falling like a stone. */
  wobble: number;
  wobbleSpeed: number;
}

/** Weighted towards phosphor: this is the site's own green, celebrating. */
const PALETTE = [
  '--color-accent',
  '--color-accent',
  '--color-accent-soft',
  '--color-ansi-yellow',
  '--color-ansi-cyan',
  '--color-ansi-blue',
  '--color-ansi-magenta',
  '--color-ansi-bright-white',
];

const GRAVITY = 1400; // px/s²
const DRAG = 0.9; // per second, applied to both axes
const LIFETIME = 3400; // ms; a piece still on screen after this fades out
const FADE = 700; // ms of fade at the end of the lifetime

function readPalette(): string[] {
  const style = getComputedStyle(document.documentElement);
  return PALETTE.map((name) => style.getPropertyValue(name).trim() || '#3ddc84');
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** One burst at a time. A second call replaces the first rather than stacking. */
let active: (() => void) | null = null;

/**
 * Throw confetti across the viewport. Safe to call when the tab is hidden or
 * motion is turned down — it simply does nothing.
 */
export function fire(): void {
  if (prefersReducedMotion() || document.visibilityState === 'hidden') return;

  active?.();

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  // The completion column is underneath this and stays clickable.
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
  const context = canvas.getContext('2d');
  if (!context) return;

  const colours = readPalette();
  let width = window.innerWidth;
  let height = window.innerHeight;
  // A viewport with no area gives every piece a zero-length throw, which is a
  // burst nobody can see and a canvas nobody can draw into.
  if (width <= 0 || height <= 0) return;

  // Device pixels, so a 6px chip is not a blurry smear on a retina panel. The
  // ratio is capped: a 3x buffer of a 4K viewport costs more than it shows.
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const resize = (): void => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
  };
  resize();

  // A narrow phone gets a thinner shower: same gesture, half the fill rate, on
  // the hardware least able to spare it.
  const perCannon = width < 640 ? 34 : width < 1024 ? 55 : 80;
  // Each cannon is aimed at the far corner: the distance sets the speed, and the
  // angle to it sets the middle of the cone. Aiming both at a fixed angle was
  // the second thing that was wrong here — a cone tuned on a 16:9 desktop threw
  // a phone's whole burst out through the side walls, because 375px of width is
  // crossed in a quarter of a second at any speed that can also climb 812px.
  const reach = Math.hypot(width, height);
  const toCorner = Math.atan2(height, width) * (180 / Math.PI);
  const lowAngle = Math.max(28, toCorner - 5);
  const angleSpread = Math.min(86, toCorner + 45) - lowAngle;

  const pieces: Piece[] = [];
  for (const side of [1, -1]) {
    // Just outside the corner, so a piece enters the frame already moving
    // rather than appearing on the edge.
    const originX = side === 1 ? -12 : width + 12;
    const originY = height + 12;
    for (let index = 0; index < perCannon; index += 1) {
      // Up and inwards, in a cone that starts just under the diagonal and opens
      // 45° past it: flatter skims the bottom edge, steeper stacks the whole
      // cannon into one column against the wall it was fired from.
      const angle = (lowAngle + Math.random() * angleSpread) * (Math.PI / 180);
      const speed = reach * (0.95 + Math.random() * 0.5);
      const long = Math.random() < 0.35;
      pieces.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * side,
        vy: -Math.sin(angle) * speed,
        // Terminal cells: taller than wide, with a few long bars for the rules
        // that draw a tmux pane border.
        w: long ? 5 + Math.random() * 5 : 2.5 + Math.random() * 1.5,
        h: long ? 1.5 : 4 + Math.random() * 2.5,
        colour: colours[Math.floor(Math.random() * colours.length)]!,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 14,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 4 + Math.random() * 5,
      });
    }
  }

  document.body.append(canvas);

  let frame = 0;
  // Both are seeded from the first animation frame, not from now. A rAF
  // timestamp is the start of the frame that was already in flight when the
  // callback was queued, so it can land *before* a performance.now() taken
  // here — which made the first delta zero or negative, and a negative delta
  // ran the whole burst backwards.
  let last = 0;
  let startedAt = 0;

  const stop = (): void => {
    if (active === stop) active = null;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onHidden);
    canvas.remove();
  };

  // Backgrounded tabs stop firing rAF, so a burst left behind would resume
  // mid-flight minutes later on the wrong lesson. Drop it instead.
  const onHidden = (): void => {
    if (document.visibilityState === 'hidden') stop();
  };

  active = stop;
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onHidden);

  const step = (now: number): void => {
    if (startedAt === 0) {
      startedAt = now;
      last = now;
    }
    // Clamped at both ends: a dropped frame or a tab restored from the
    // background must not teleport every piece off screen in one integration
    // step, and a clock that appears to run backwards must not integrate
    // backwards.
    const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30);
    last = now;

    const age = now - startedAt;
    const fade = age > LIFETIME - FADE ? Math.max(0, (LIFETIME - age) / FADE) : 1;

    context.clearRect(0, 0, width, height);
    context.globalAlpha = fade;

    let alive = 0;
    const decay = Math.pow(DRAG, dt);
    for (const piece of pieces) {
      piece.vx *= decay;
      piece.vy = piece.vy * decay + GRAVITY * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.angle += piece.spin * dt;
      piece.wobble += piece.wobbleSpeed * dt;

      // Below the bottom edge and still climbing is a piece that has not
      // arrived yet — every one of them starts there, just outside the corner.
      // Only a piece on its way down is gone for good. Testing the position
      // alone killed the entire burst on any first frame whose delta rounded
      // to zero: nothing had moved, so nothing was on screen, so the canvas
      // was torn down one frame after it was built.
      //
      // Off the sides is never fatal either, because drag and the wobble can
      // still carry a piece back into view.
      if (piece.vy > 0 && piece.y - piece.h > height) continue;
      alive += 1;

      // Edge-on for part of every turn: a flat chip tumbling, out of one
      // cheap cosine rather than a second rotation matrix.
      const flip = Math.cos(piece.wobble);
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.scale(1, flip);
      context.fillStyle = piece.colour;
      context.fillRect(-piece.w, -piece.h, piece.w * 2, piece.h * 2);
      context.restore();
    }

    if (alive === 0 || age >= LIFETIME) {
      stop();
      return;
    }
    frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
}
