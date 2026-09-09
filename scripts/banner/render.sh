#!/usr/bin/env bash
# Render build/banner.png from banner.html.
#
#   ./scripts/banner/render.sh
#
# The output is not committed. The README's banner is served from
# assets.learntmux.dev/banner.png, so a re-render only reaches the README once
# it is uploaded there; build/ is gitignored to keep the binary out of the repo.
#
# The banner is drawn in a browser rather than hand-authored as SVG because it
# has to use the real brand faces, and GitHub will not load a webfont from an
# SVG. Chrome renders it at 2x against the woff2 files sitting next to this
# script, so the output is identical on any machine.
#
# The quantise pass at the end is safe: the artwork is flat, so 64 colours
# reproduce every brand hex exactly and cut the file from ~65 KB to ~21 KB.
# Do not add a gradient without dropping `+dither` — it will band.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }
command -v magick >/dev/null || { echo "ImageMagick (magick) not found" >&2; exit 1; }

"$CHROME" --headless --disable-gpu --hide-scrollbars --force-color-profile=srgb \
  --screenshot="raw.png" --window-size=1200,420 \
  --default-background-color=0a0b0eff --force-device-scale-factor=2 \
  "file://$PWD/banner.html"

magick raw.png -strip +dither -colors 64 -define png:compression-level=9 build/banner.png
rm -f raw.png

echo "wrote scripts/banner/build/banner.png ($(stat -f%z build/banner.png) bytes)"
