---
title: "Apply window layouts"
slug: "window-layouts"
summary: "Cycle through the preset layouts with Space, pick layouts by name from the prompt, and confirm the Meta keys with the help prompt."
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
    description: "Apply a layout by name: even-horizontal, even-vertical, main-horizontal, main-vertical, tiled (plus the mirrored variants on tmux 3.5 and newer)"
  - key: "C-b M-1"
    command: "select-layout even-horizontal (M-2 even-vertical; on tmux 3.5 and newer M-1 to M-7 also cover main-horizontal, main-horizontal-mirrored, main-vertical, main-vertical-mirrored and tiled, in that order)"
    description: "Apply a preset layout directly; confirm what each Meta key does with C-b /"
wikiSections: ["Window layouts", "Help keys", "Summary of terms"]
challenge: false
objective: "With four panes, apply even-vertical, then main-vertical, and finish with the tiled layout."
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
  - "The prompt command is `select-layout`, or `selectl` for short. It takes a layout name as its argument."
  - "Open the prompt with `C-b :`, type `select-layout even-vertical`, then press Enter. Repeat with `main-vertical`, then `tiled`."
  - "`C-b Space` also cycles through the named layouts in order, so pressing it enough times reaches the same three layouts without typing a name."
  - "Order matters: reach even-vertical first, then main-vertical, then finish on tiled. Typing the name from the prompt is the most direct way to hit each one exactly."
---

Resizing in Level 2, Task 5 left window 0 with four panes and uneven borders. Instead of dragging each one back into shape by hand, tmux can arrange every pane in a window at once using a named window layout.

## Concept

A window layout describes the size and position of every pane in a window. tmux ships five preset layouts: `even-horizontal` and `even-vertical` spread the panes out evenly side by side or stacked; `main-horizontal` and `main-vertical` give one pane a large area and spread the rest evenly along one edge; `tiled` arranges the panes into as many rows as columns.

The command `select-layout` (`selectl` for short) applies a layout by name from the command prompt. The key binding `C-b Space` runs `next-layout`, which rotates the current window through the same five layouts in order, so pressing it repeatedly cycles back to where you started.

Each layout also has a direct key: `C-b M-1` for `even-horizontal`, `C-b M-2` for `even-vertical`, and so on. Which layout `M-3` through `M-5` (or further) reach depends on the tmux version, since newer releases inserted the mirrored main layouts into the list. `C-b /`, from Level 1, Task 3, shows what a single key is bound to, which settles the question for whatever tmux you are running.

## Do this

1. Press `C-b :` to open the command prompt, type `select-layout even-vertical`, and press Enter. The four panes stack into one column of equal height.
2. Open the prompt again with `C-b :`, type `select-layout main-vertical`, and press Enter. Pane A becomes one large pane on the left; B, C and D stack evenly on the right.
3. Press `C-b Space` a few times and watch `next-layout` rotate through the presets. Stop once you see four even panes in a two-by-two grid: the `tiled` layout.
4. Press `C-b /` then `M-3`. The prompt at the bottom names the layout that key applies on this tmux.

**Done when** window 0 has been arranged as even-vertical, then main-vertical, and finally tiled, in that order.

## What just happened

Typing a layout name at the command prompt ran `select-layout even-vertical`, then `select-layout main-vertical`. Both commands recompute every pane's size and position in the current window without changing which pane is active or what is running in it. `C-b Space` runs `next-layout`, which does the same thing but advances to the next name in the fixed list instead of taking one you choose.

The direct Meta keys run `select-layout` with a specific name baked in, the same way `C-b %` from Level 1, Task 7 is a shortcut for `split-window -h`. Which name `M-3` and onward reach shifted when newer tmux versions added mirrored main layouts to the list, so `C-b /` followed by the key is the reliable way to check, rather than trusting a fixed table. Note that applying a layout while a pane is zoomed (Level 2, Task 4) first unzooms the window, since a layout has to see every pane to arrange them.

## Go further

- `display-message -p '#{window_layout}'` prints the raw layout string tmux uses internally: a checksum, the window size, and the panes nested in `[` `]` for rows and `{` `}` for columns.
- `select-layout -E` re-spreads the panes onto the current layout's shape, which is a quick way to undo manual resizing without changing which named layout is in effect.
- The mirrored layouts, `main-horizontal-mirrored` and `main-vertical-mirrored`, put the large pane on the opposite edge and are only available by name or Meta key on tmux 3.5 and newer.
