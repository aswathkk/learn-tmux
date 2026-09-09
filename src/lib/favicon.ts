/**
 * The mark as raster icons, drawn at build time from public/favicon.svg.
 *
 * The SVG stays the one authored copy — every size here is rasterised from it,
 * so the mark can never drift between formats. Raster exists because the SVG
 * alone does not reach everything: Safari and older browsers want a PNG, and a
 * bare-root /favicon.ico is still what feed readers, crawlers, link unfurlers
 * and browser default-bookmark UIs ask for when a page declares nothing.
 *
 * librsvg rasterises a viewBox-only SVG at 72dpi, which is the 32x32 the
 * viewBox declares — so a larger icon has to raise the density rather than
 * resize a 32px bitmap up, or the round corners land soft.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

/** The authored mark. Read from the working directory for the same reason
 *  src/lib/og.ts reads its fonts that way: this runs from the project root. */
const MARK = join(process.cwd(), 'public/favicon.svg');

/** The viewBox the mark is drawn in, and so the size 72dpi renders it at. */
const MARK_SIZE = 32;

/** The sizes packed into favicon.ico: the three a Windows shell and a browser
 *  tab actually pick between. Anything larger belongs in a PNG. */
export const ICO_SIZES = [16, 32, 48];

/** The single PNG the pages link to. 96 is the largest size a desktop browser
 *  asks a tab icon for, and it downsamples cleanly to 48 and 32. */
export const PNG_SIZE = 96;

/** apple-touch-icon.png. 180 is what iOS asks for at 3x, and every smaller
 *  device downsamples it itself. */
export const APPLE_SIZE = 180;

/** Brand guide §03. The mark's own background, repeated here because this file
 *  draws a PNG and a stylesheet is not a data source (same call as og.ts). */
const VOID = '#0a0b0e';

/** The mark as a PNG of `size` square. */
export async function renderIcon(size: number): Promise<Buffer> {
  return sharp(readFileSync(MARK), { density: (72 * size) / MARK_SIZE })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Pack PNGs into an ICO.
 *
 * ICO is a 6-byte header, then one 16-byte directory entry per image, then the
 * images themselves. The entries carry PNG bytes rather than the old BMP
 * payload, which every browser and Windows since Vista reads — and which keeps
 * the file a tenth of the size of the BMP form.
 */
export function packIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, png }, index) => {
    const entry = 16 * index;
    // 0 means 256 in a byte-wide dimension; nothing here is that large, but
    // the modulo is what the format asks for.
    directory.writeUInt8(size % 256, entry);
    directory.writeUInt8(size % 256, entry + 1);
    directory.writeUInt8(0, entry + 2); // palette size: 0, the PNG has its own
    directory.writeUInt8(0, entry + 3); // reserved
    directory.writeUInt16LE(1, entry + 4); // colour planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.png)]);
}

/** favicon.ico, every size in ICO_SIZES. */
export async function renderIco(): Promise<Buffer> {
  const images = await Promise.all(
    ICO_SIZES.map(async (size) => ({ size, png: await renderIcon(size) })),
  );
  return packIco(images);
}

/**
 * The mark as an iOS home-screen icon.
 *
 * Two departures from the tab icons, both because iOS draws this one itself:
 * it applies its own rounded-rectangle mask, and it composites transparency
 * onto white. So the artwork is flattened onto the mark's own background,
 * which fills the corners its rx=8 leaves open — the rounding then comes from
 * the mask rather than from a shape sitting inside it.
 */
export async function renderAppleIcon(): Promise<Buffer> {
  return sharp(readFileSync(MARK), { density: (72 * APPLE_SIZE) / MARK_SIZE })
    .resize(APPLE_SIZE, APPLE_SIZE)
    .flatten({ background: VOID })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
