---
title: "Resize panes"
slug: "resize-panes"
summary: "Grow and shrink panes in small and large steps with the Ctrl and Meta arrow keys, or from the prompt."
seoDescription: 'Resize tmux panes with C-b and the Ctrl arrows for one cell, the Meta arrows for five, or resize-pane with an exact number of cells.'
level: 2
task: 5
difficulty: intermediate
estimatedMinutes: 3
concepts: [resize, pane-width, pane-height]
keys:
  - key: "C-b C-Left"
    command: "resize-pane -L 1 (C-Right -R, C-Up -U, C-Down -D)"
    description: "Resize the active pane by one cell in that direction"
  - key: "C-b M-Left"
    command: "resize-pane -L 5 (M-Right, M-Up, M-Down)"
    description: "Resize the active pane by five cells in that direction"
  - key: ":resize-pane -R 20"
    command: "resize-pane -L/-R/-U/-D <cells>"
    description: "Resize by any number of cells from the prompt; the fallback when Alt or Ctrl arrows do not reach tmux"
wikiSections: ["Resizing and zooming panes", "The command prompt"]
challenge: false
objective: "The left pane is at least 80 columns wide."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux split-window -h -t learn:0"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: left-pane-wide
    description: "The left pane of window 0 in session learn is at least 80 columns wide"
    kind: tmux
    command: "display-message -p -t learn:0.0 '#{pane_width}'"
    expect: "^([89][0-9]|1[0-9][0-9])$"
hints:
  - "The arrow names the direction the border moves. To grow the left pane, push its right border right: `C-b C-Right` or `C-b M-Right`."
  - "`C-Right` moves one column, `M-Right` five. After one `C-b`, keep tapping the arrow: it repeats without another prefix."
  - "If Ctrl or Alt arrows never reach tmux, use `C-b :` and `resize-pane -R 20`."
---

## Concept

`C-b C-Right` moves the active pane's right border one column; `C-b M-Right` (Alt) moves it five. The other arrows do the same in their direction. After one `C-b`, further arrow presses repeat without another prefix.

`resize-pane` moves a border, taking columns or rows from the neighbour, so growing one pane always shrinks another. The keys repeat because they are bound with the repeat flag: presses within `repeat-time` (500 ms) count as one sequence.

Not every terminal passes Ctrl or Alt plus arrows through. The prompt form, `resize-pane -R 20`, works everywhere and takes an exact count.

## Do this

1. Press `C-b C-Right`, then keep tapping `C-Right`. The border moves right a column at a time.
2. Press `C-b M-Right` a few times. Five columns per press, until the left pane passes 80 of the 120 columns.
3. If neither moved the border, press `C-b :`, type `resize-pane -R 20`, Enter.

## What just happened

`C-b C-Right` runs `resize-pane -R`, `C-b M-Right` runs `resize-pane -R 5`, both on the active pane. With the right pane active, `-L` would shrink it and grow the left pane instead: the border moved is the same, the pane it belongs to differs. Check which pane is active before resizing.

## Go further

- `resize-pane -x 100` sets an absolute width; `-y` a height; `-x 50%` a percentage.
- `select-layout` resizes every pane in the window at once, using a preset.
