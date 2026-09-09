# Social card fonts

The two brand faces, as static TTF instances, for `src/lib/og.ts`.

They are here rather than reused from the site build for two reasons. satori
reads fonts through fontkit, which takes TTF and OTF but not the WOFF2 the site
serves; and it picks one instance per file, so a variable font would draw the
wordmark and the title at the same weight. One file per weight is the only shape
that renders correctly.

`scripts/banner/` keeps its own copies for the same reason: neither the banner
nor the cards should need a site build to redraw.

Both are Open Font License:
[Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) and
[JetBrains Mono](https://www.jetbrains.com/lp/mono/).
