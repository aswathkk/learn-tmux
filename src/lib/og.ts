/**
 * Social cards, drawn at build time.
 *
 * Every lesson gets its own 1200×630 PNG at /og/<slug>.png, rendered from the
 * same frontmatter the page renders from. That is the point: a card cannot
 * describe a lesson that no longer exists, and a new lesson cannot ship with
 * the generic site card by accident.
 *
 * The drawing is satori (flexbox → SVG, with the glyphs embedded as paths) and
 * then sharp (SVG → PNG). No browser, so the build stays hermetic — unlike
 * docs/banner-src/render.sh, which is a one-off run by hand on a machine with
 * Chrome. The two agree on the composition: the mark and wordmark from the
 * brand guide §02, the palette from §03, both faces from §04, and the green
 * status line from §05.
 *
 * The fonts are static instances, not the variable files the site serves:
 * satori reads TTF/OTF through fontkit and picks one instance per weight, so a
 * variable file would render every weight at 400.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import type { Level } from './levels';
import type { LessonContext, LessonEntry } from './lessons';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Brand guide §03. Repeated here rather than parsed out of global.css: this
 *  file draws a PNG, and a stylesheet is not a data source. */
const VOID = '#0a0b0e';
const SURFACE = '#0f1114';
const PHOSPHOR = '#3ddc84';
const INK = '#e6e9ee';
const MUTED = '#c3c9d2';
const DIM = '#8b93a1';
const LINE = 'rgba(255,255,255,0.10)';

const SANS = 'Instrument Sans';
const MONO = 'JetBrains Mono';

/**
 * Resolved against the working directory rather than `import.meta.url`: this
 * module is bundled before it runs, so its own URL points into the build's
 * temporary chunk directory, not into src/.
 */
const FONT_DIR = join(process.cwd(), 'src/lib/og/fonts');

const font = (file: string) => readFileSync(join(FONT_DIR, file));

/** Read once per build, not once per card. */
const fonts = [
  { name: SANS, data: font('InstrumentSans-SemiBold.ttf'), weight: 600 as const, style: 'normal' as const },
  { name: MONO, data: font('JetBrainsMono-Regular.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: MONO, data: font('JetBrainsMono-SemiBold.ttf'), weight: 600 as const, style: 'normal' as const },
];

/**
 * satori takes React elements, and this file is not JSX — the card is small
 * enough that a plain node factory is less machinery than adding a JSX runtime
 * to a .ts build module.
 */
type Style = Record<string, string | number>;
interface Node {
  type: string;
  props: { style: Style; children?: unknown };
}

const box = (style: Style, children?: unknown): Node => ({ type: 'div', props: { style, children } });
const text = (style: Style, value: string): Node => ({ type: 'div', props: { style, children: value } });

/** The split-pane mark: one tall pane, two stacked. Brand guide §02. */
function mark(): Node {
  const cell = { width: 15, height: 15, background: PHOSPHOR, borderRadius: 2 };
  return box({ display: 'flex', gap: 4 }, [
    box({ ...cell, height: 34 }),
    box({ display: 'flex', flexDirection: 'column', gap: 4 }, [
      box({ ...cell, opacity: 0.6 }),
      box({ ...cell, opacity: 0.3 }),
    ]),
  ]);
}

function wordmark(): Node {
  const base = { fontFamily: MONO, fontWeight: 600, fontSize: 30, letterSpacing: '-0.03em' };
  return box({ display: 'flex', alignItems: 'center', gap: 15 }, [
    mark(),
    box({ display: 'flex' }, [
      text({ ...base, color: DIM }, 'learn'),
      text({ ...base, color: INK }, 'tmux'),
      text({ ...base, color: PHOSPHOR }, '.dev'),
    ]),
  ]);
}

/** A keycap, or the challenge badge. Same shape, different ink. */
function chip(label: string, tone: 'key' | 'challenge'): Node {
  return text(
    {
      fontFamily: MONO,
      fontSize: 22,
      color: tone === 'challenge' ? PHOSPHOR : MUTED,
      background: SURFACE,
      border: `1px solid ${tone === 'challenge' ? 'rgba(61,220,132,0.35)' : LINE}`,
      borderRadius: 8,
      padding: '11px 16px',
    },
    label,
  );
}

/** The green status line, the one place the palette fills a surface. §05. */
function statusLine(session: string, current: string): Node {
  return box(
    {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: PHOSPHOR,
      color: VOID,
      borderRadius: 4,
      padding: '8px 14px',
      fontFamily: MONO,
      fontSize: 18,
    },
    [
      text({ fontWeight: 600 }, session),
      text({ background: VOID, color: PHOSPHOR, padding: '3px 8px' }, current),
    ],
  );
}

export interface OgCard {
  /** The line above the title: where in the course this is. */
  eyebrow: string;
  title: string;
  /** Keycaps under the title. Empty for a challenge. */
  chips: string[];
  challenge: boolean;
  /** The two halves of the status line, e.g. `[learn]` and `4:zoom-a-pane*`. */
  session: string;
  current: string;
  /** Bottom right: position and cost. */
  meta: string;
}

/**
 * Titles are capped at 60 characters by the schema, which is one line at 60px
 * and two at the long end. Dropping a step at the top of that range keeps the
 * longest title on two lines instead of three, so every card holds the same
 * shape.
 */
function titleSize(title: string): number {
  if (title.length <= 28) return 62;
  if (title.length <= 44) return 54;
  return 46;
}

function card(input: OgCard): Node {
  return box(
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: VOID,
      padding: '56px 64px',
      fontFamily: SANS,
    },
    [
      box({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
        wordmark(),
        text(
          {
            fontFamily: MONO,
            fontSize: 15,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: DIM,
          },
          input.eyebrow,
        ),
      ]),

      box({ display: 'flex', flexDirection: 'column', gap: 28 }, [
        text(
          {
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: titleSize(input.title),
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: INK,
          },
          input.title,
        ),
        box({ display: 'flex', gap: 12 }, [
          ...(input.challenge ? [chip('challenge · no new keys', 'challenge')] : []),
          ...input.chips.map((label) => chip(label, 'key')),
        ]),
      ]),

      box({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
        statusLine(input.session, input.current),
        text({ fontFamily: MONO, fontSize: 16, color: DIM }, input.meta),
      ]),
    ],
  );
}

/** SVG with the glyphs already outlined, then a quantised PNG: the artwork is
 *  flat, so a 128-colour palette reproduces every brand hex exactly. */
export async function renderCard(input: OgCard): Promise<Buffer> {
  const svg = await satori(card(input) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
    embedFont: true,
  });
  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: true, colours: 128 })
    .toBuffer();
}

/**
 * Keycaps worth printing: as many as the row holds, up to three.
 *
 * Measured rather than capped by character count, because a key is not always
 * a keystroke — level 1 teaches `tmux new -s name` and level 4 teaches
 * `:set -g status-position top`, and a length limit chosen for `C-b z` would
 * silently leave the whole of level 4 with an empty row. JetBrains Mono is
 * monospaced at 0.6 em, so the width of a chip is exact arithmetic.
 */
const CHIP_GAP = 12;
/** 16px of padding either side, plus the hairline. */
const CHIP_FURNITURE = 34;
const ROW_WIDTH = OG_WIDTH - 2 * 64;

function keycaps(lesson: LessonEntry): string[] {
  const chosen: string[] = [];
  let used = 0;
  for (const { key } of lesson.data.keys) {
    if (chosen.length === 3) break;
    const width = key.length * 0.6 * 22 + CHIP_FURNITURE + (chosen.length ? CHIP_GAP : 0);
    if (used + width > ROW_WIDTH) continue;
    chosen.push(key);
    used += width;
  }
  return chosen;
}

/** The card for one lesson, from its frontmatter and its place in the course. */
export function lessonCard(lesson: LessonEntry, context: LessonContext): OgCard {
  const { data } = lesson;
  const level: Level = context.level;
  return {
    eyebrow: `Level ${level.n} · ${level.name}`,
    title: data.title,
    chips: data.challenge ? [] : keycaps(lesson),
    challenge: data.challenge,
    session: '[learn]',
    current: `${context.coursePosition}:${data.slug}*`,
    meta: `Task ${context.coursePosition} of ${context.totalInCourse} · ${data.estimatedMinutes} min`,
  };
}

/** /og/detach-and-reattach.png — lesson slugs are unique across the course. */
export function lessonOgPath(lesson: LessonEntry): string {
  return `/og/${lesson.data.slug}.png`;
}

/** What a reader who cannot see the card is told it says. */
export function lessonOgAlt(lesson: LessonEntry, context: LessonContext): string {
  return `learntmux social card: ${lesson.data.title}, task ${context.coursePosition} of ${context.totalInCourse} in Level ${context.level.n} ${context.level.name}.`;
}
