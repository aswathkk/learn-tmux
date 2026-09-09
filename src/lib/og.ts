/**
 * Social cards, drawn at build time.
 *
 * This file draws one; src/lib/og-cards.ts says which pages get one and what
 * each says. The split is deliberate — the composition is a brand decision and
 * the catalogue is a content one, and they change for different reasons.
 *
 * The drawing is satori (flexbox → SVG, with the glyphs embedded as paths) and
 * then sharp (SVG → PNG). No browser, so the build stays hermetic — unlike
 * scripts/banner/render.sh, which is a one-off run by hand on a machine with
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

/** The card's own margin, and the type size of a chip. Both are read by
 *  `fitChips` below, so a change here cannot leave the measuring stale. */
const PADDING = 64;
const CHIP_SIZE = 22;

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

/** A keycap, or the one accented chip a card is allowed. Same shape, different ink. */
function chip(label: string, tone: 'key' | 'accent'): Node {
  return text(
    {
      fontFamily: MONO,
      fontSize: CHIP_SIZE,
      color: tone === 'accent' ? PHOSPHOR : MUTED,
      background: SURFACE,
      border: `1px solid ${tone === 'accent' ? 'rgba(61,220,132,0.35)' : LINE}`,
      borderRadius: 8,
      padding: '11px 16px',
    },
    label,
  );
}

/**
 * How many chips fit on one row.
 *
 * Arithmetic rather than a guess, and it lives here because it is a fact about
 * how `chip` draws: JetBrains Mono is monospaced at 0.6 em, so a label's width
 * is its length. A character limit would be the wrong instrument — a chip is
 * not always a keystroke, and a limit chosen for `C-b z` would drop every
 * option in level 4, which is what the whole level is made of.
 */
const CHIP_GAP = 12;
const CHIP_FURNITURE = 2 * 16 + 2;
const ROW_WIDTH = OG_WIDTH - 2 * PADDING;

export function fitChips(labels: string[], limit = 3): string[] {
  const chosen: string[] = [];
  let used = 0;
  for (const label of labels) {
    if (chosen.length === limit) break;
    const width = label.length * 0.6 * CHIP_SIZE + CHIP_FURNITURE + (used ? CHIP_GAP : 0);
    if (used + width > ROW_WIDTH) continue;
    chosen.push(label);
    used += width;
  }
  return chosen;
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
  /** The line opposite the wordmark: what kind of page this is. */
  eyebrow: string;
  title: string;
  /**
   * Keycaps under the title, or whatever else the page is made of — the
   * categories a hub lists, the versions a config was written against. Omit
   * them and the row disappears rather than leaving a gap.
   */
  chips?: string[];
  /** The one chip drawn in phosphor. A page gets at most one thing shouted. */
  accent?: string;
  /** The two halves of the status line, e.g. `[learn]` and `15:zoom-a-pane*`. */
  session: string;
  current: string;
  /** Bottom right: whatever counts. */
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
      padding: `56px ${PADDING}px`,
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
        ...(input.accent || input.chips?.length
          ? [
              box({ display: 'flex', gap: 12 }, [
                ...(input.accent ? [chip(input.accent, 'accent')] : []),
                ...(input.chips ?? []).map((label) => chip(label, 'key')),
              ]),
            ]
          : []),
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
