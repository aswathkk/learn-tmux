---
title: "Resize panes"
slug: "resize-panes"
summary: "Grow and shrink panes in small and large steps with the Ctrl and Meta arrow keys, or from the prompt."
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
objective: "Make the left pane at least 80 columns wide."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "split-window -h -t learn:0"
  - "select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: left-pane-wide
    description: "The left pane of window 0 in session learn is at least 80 columns wide"
    kind: tmux
    command: "display-message -p -t learn:0.0 '#{pane_width}'"
    expect: "^([89][0-9]|1[0-9][0-9])$"
hints:
  - "The key you press moves the border in that direction. To grow the left pane, push its right border to the right: `C-b C-Right` or `C-b M-Right`."
  - "`C-b C-Right` moves the border one cell per press. `C-b M-Right` moves it five cells per press, so it gets there faster."
  - "If Ctrl or Alt plus an arrow key does nothing, open the prompt with `C-b :`, type `resize-pane -R 20`, and press Enter."
---

Two panes sit side by side in window 0 of `learn`, and the left one is too narrow for the file open in it. tmux does not let you type a pane size directly, but it does let you move the border between panes, cell by cell or in bigger jumps.

## Concept

A window's panes sit in a layout, a grid of borders splitting the window's rows and columns between them. The `resize-pane` command moves one of these borders. It takes columns or rows from the pane on the other side of the border and gives them to the active pane, so resizing one pane always shrinks its neighbour.

`C-b C-Left`, `C-b C-Right`, `C-b C-Up` and `C-b C-Down` move the border by one cell in that direction. `C-b M-Left`, `C-b M-Right`, `C-b M-Up` and `C-b M-Down` move it by five cells. Both sets repeat: press `C-b` once, then keep tapping the arrow key, and tmux keeps running `resize-pane` as long as each press lands within `repeat-time` of the last one (500 milliseconds by default). Only then do you need to press `C-b` again.

Not every terminal passes Ctrl+arrow or Alt+arrow through to tmux. When one doesn't, use the command prompt instead: `C-b :` opens it, and typing a `resize-pane` command with an exact number of columns or rows works everywhere.

Resizing also unzooms the window, if a pane in it was zoomed, because changing a pane's size changes the layout tmux was holding onto for later.

## Do this

1. You are attached to `learn:0`, split into two panes side by side. The left pane, at index 0, is active.
2. Press `C-b`, release, then hold Ctrl and press the Right arrow key. This is `C-b C-Right`: the prefix, then a second key that itself uses Ctrl. The border between the panes moves one cell to the right.
3. Press `C-Right` a few more times without pressing `C-b` again. It keeps working, as long as you don't pause too long between presses.
4. Press `C-b M-Right` once. The border jumps five cells to the right in one press.
5. Repeat `C-b M-Right`, or `C-b C-Right`, until the left pane is at least 80 columns, well over half the 120-column window.
6. If Ctrl or Alt arrows don't move the border, press `C-b :`, type `resize-pane -R 20`, and press Enter. This grows the active pane by 20 columns to the right regardless of what your terminal passes through.

**Done when** the left pane is at least 80 columns wide.

## What just happened

`C-b C-Right` runs `resize-pane -R`, which moves the border one cell by default. `C-b M-Right` runs `resize-pane -R 5`. Both act on the active pane, here the left one, and move its right border into its neighbour's space rather than resizing the window.

The arrow keys are bound with tmux's repeat flag, so a run of presses inside `repeat-time` counts as one sequence instead of needing the prefix each time. `resize-pane -R 20` at the command prompt does the same job with an exact adjustment and no dependence on Ctrl or Alt reaching tmux at all, which matters over some SSH connections and inside some terminal emulators.

Resizing the wrong pane is a common mistake. With the right pane active, `C-b M-Left` also grows the left pane, since it moves the same shared border, but now `-L` shrinks the active (right) pane instead of growing it. Check which pane is active, using its highlighted border, before you resize.

## Go further

- `resize-pane -x 100` sets an absolute width in columns instead of a relative adjustment; `-y` does the same for height.
- A percentage works too: `resize-pane -x 50%` sets the pane to half the window's width.
- Level 2, Task 6 covers the named layouts that resize every pane in the window at once.
