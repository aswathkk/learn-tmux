# Banner source

`banner.html` is the source of the README banner. Render it with:

```
./scripts/banner/render.sh
```

Chrome draws it at 2x and ImageMagick quantises the result to `build/banner.png`,
which is gitignored — the rendered PNG is not kept in the repo. The README points
at `https://assets.learntmux.dev/banner.png`, so a re-render only shows up once
the new file is uploaded there.

Needs Chrome at `/Applications/Google Chrome.app` and ImageMagick (`magick`).

## The composition

The frame is split: the claim on the left, the thing being claimed on the right.
The terminal is drawn the way tmux draws one — a tall pane beside two stacked,
divided by single lines, status line across the bottom — because the promise is
that a real tmux runs in the browser, and a picture of one is cheaper to believe
than a sentence about it.

It follows the brand guide: the split-pane mark and wordmark from §02, the
palette from §03, both faces from §04, and the green status line from §05 —
which the guide asks for in every hero. It departs from §07 on one point: the
composition carries the terminal as well as the wordmark, the claim and the
status line. §07 asks for nothing beside those three, and an earlier version
obeyed it, but that left the right half of a 1200×420 frame empty and the
strongest thing the site has unshown.

Phosphor green appears as the mark, the active pane's border and the status
line, and nowhere else. §03 reserves it for progress and live state; the pane
border qualifies because in tmux it is what marks the pane you are typing into.

The two `.woff2` files are the same faces the site ships, kept alongside so the
banner renders identically without a site build. Both are Open Font License:
[Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) and
[JetBrains Mono](https://www.jetbrains.com/lp/mono/).
