---
title: "Split the window into panes"
slug: "split-window-into-panes"
summary: "Cut one pane into two side by side, then split the right one top and bottom."
level: 1
task: 7
difficulty: beginner
estimatedMinutes: 3
concepts: [pane, split, window-layout, active-pane]
keys:
  - key: "C-b %"
    command: "split-window -h"
    description: "Split the active pane into left and right"
  - key: 'C-b "'
    command: "split-window -v"
    description: "Split the active pane into top and bottom"
wikiSections: ["Splitting the window", "Sessions, windows and panes", "Summary of terms"]
challenge: false
objective: "Window 0 has three panes: one on the left, two stacked on the right."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: three-panes
    description: "Window 0 of session learn has three panes"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_panes}'"
    expect: "^3$"
  - id: left-and-stacked-right
    description: "Window 0 has one pane on the left and a right column split into two"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_layout}'"
    expect: '^\w+,\d+x\d+,0,0\{\d+x\d+,0,0,\d+,\d+x\d+,\d+,0\[.*\]\}$'
hints:
  - "Release Ctrl after `C-b`. `%` is Shift+5 on its own; holding Ctrl through it does nothing."
  - "`C-b %` splits left and right. `C-b \"` splits top and bottom. The new pane becomes active."
  - "`C-b %` once, then `C-b \"` once. The second split lands in the right pane because it is already active."
---

## Concept

`C-b %` splits the active pane into left and right. `C-b "` splits it into top and bottom. The new pane becomes the active one, marked by the green border, so the next split lands there.

A pane is a rectangle of the window running its own program. One pane is active: typing goes there, and it is the default target for commands. The set of pane sizes and positions is the window's layout.

The flag names are the confusing part: `split-window -h` (horizontal) puts panes side by side, `-v` (vertical) stacks them. Think of the direction the new pane is added in, not the line between.

## Do this

1. Press `C-b %`. The window splits into two panes side by side; the right one is active.
2. Press `C-b "`. The right pane splits into top and bottom. Three panes, the bottom right active.

## What just happened

`C-b %` ran `split-window -h` on the only pane; `C-b "` ran `split-window -v` on the pane that had just become active. Each split cuts the active pane and moves the green border to the new half, which is why no navigation was needed between them.

## Go further

- The same splits from the prompt: `split-window -h` and `split-window -v`, which also take flags for size and placement.
- Panes can be split again and again until one is too small to divide.
