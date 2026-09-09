---
title: "Apply window layouts"
slug: "window-layouts"
summary: "Cycle through the preset layouts with Space, pick layouts by name from the prompt, and confirm the Meta keys with the help prompt."
seoDescription: 'Cycle the preset tmux window layouts with C-b Space, or pick even-horizontal, main-vertical and the rest by name with select-layout.'
level: 2
task: 6
difficulty: intermediate
estimatedMinutes: 4
concepts: [window-layout, layouts, select-layout]
keys:
  - key: "C-b Space"
    command: "next-layout"
    description: "Rotate to the next preset layout"
  - key: ":select-layout name"
    command: "select-layout (selectl)"
    description: "Apply a layout by name: even-horizontal, even-vertical, main-horizontal, main-vertical or tiled"
  - key: "C-b M-1"
    command: "select-layout even-horizontal (M-2 even-vertical, M-3 onward the rest; order varies by version)"
    description: "Apply a preset layout directly; confirm what each Meta key does with C-b /"
wikiSections: ["Window layouts", "Help keys", "Summary of terms"]
challenge: false
objective: "Window 0 has been even-vertical, then main-vertical, and is now tiled."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux set-option -g pane-border-status top"
  - "tmux split-window -h -t learn:0"
  - "tmux split-window -v -t learn:0.1"
  - "tmux select-pane -t learn:0.0"
  - "tmux split-window -v -t learn:0.0"
  - "tmux select-pane -t learn:0.0 -T A"
  - "tmux select-pane -t learn:0.1 -T B"
  - "tmux select-pane -t learn:0.2 -T C"
  - "tmux select-pane -t learn:0.3 -T D"
  - "tmux resize-pane -t learn:0.0 -D 5"
  - "tmux resize-pane -t learn:0.2 -R 10"
startCommand: "tmux attach -t learn"
checks:
  - id: even-vertical-applied
    description: "Window 0 of session learn is arranged in a single column, no nesting"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_layout}'"
    expect: "^\\w+,\\d+x\\d+,0,0\\[[^{}]*\\]$"
  - id: main-vertical-applied
    description: "Window 0 of session learn has one large pane on the left and a stacked column on the right"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_layout}'"
    expect: "^\\w+,\\d+x\\d+,0,0\\{[^{}\\[\\]]*\\[[^{}\\[\\]]*\\]\\}$"
  - id: tiled-applied
    description: "Window 0 of session learn is tiled: two rows of two panes"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_layout}'"
    expect: "^\\w+,\\d+x\\d+,0,0\\[[^\\[\\]]*\\{[^{}]*\\}[^\\[\\]]*\\{[^{}]*\\}\\]$"
hints:
  - "Order matters and each layout is checked in turn: even-vertical, then main-vertical, then tiled."
  - "`C-b :` then `select-layout even-vertical`. Repeat for `main-vertical`, then `tiled`."
  - "`C-b Space` cycles the presets in order, so it reaches all three without typing, but it is easy to overshoot."
---

## Concept

`select-layout name` at the prompt arranges every pane in the window at once. Five presets: `even-horizontal`, `even-vertical`, `main-horizontal`, `main-vertical`, `tiled`. `C-b Space` cycles through them.

`even-*` spreads panes equally side by side or stacked. `main-*` gives one pane most of the window and lines the rest up along one edge. `tiled` makes a grid. Applying a layout keeps every pane's contents and the active pane; it only recomputes sizes.

`C-b M-1` to `M-5` (or `M-7` on tmux 3.5 and newer, which added mirrored main layouts) apply presets directly. Which number means which shifted between versions, so `C-b /` then the key is the way to check.

## Do this

1. Press `C-b :`, type `select-layout even-vertical`, Enter. Four equal rows.
2. Press `C-b :`, type `select-layout main-vertical`, Enter. A is large on the left; B, C and D stack on the right.
3. Press `C-b Space` until you see a two-by-two grid: `tiled`.

## What just happened

`select-layout` and `next-layout` (`C-b Space`) both rebuild the window from a preset. A zoomed window unzooms first, since a layout needs every pane visible. Manual resizes are simply overwritten.

## Go further

- `select-layout -E` re-spreads panes on the current layout, undoing manual resizes.
- `display-message -p '#{window_layout}'` prints the raw layout string tmux uses internally.
- `C-b M-1` applies `even-horizontal` directly; check the others with `C-b /` then `M-3`.
