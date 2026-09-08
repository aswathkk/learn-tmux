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
objective: "Turn the single pane of window 0 into three panes: one on the left and two stacked on the right."
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
  - "Two keys do this: `C-b %` splits left and right, `C-b \"` splits top and bottom. Release Ctrl before the second key of each."
  - "Split the single pane first with `C-b %`. The new pane, on the right, becomes the active one."
  - "With the right pane active, press `C-b \"` to split it again. You do not need to move between panes first."
---

A single pane can only show one program. Splitting the window lets you watch a log and edit a file, or keep a shell free while a job runs, without leaving the window.

## Concept

A pane is created by splitting a window: cutting a rectangle of terminal into two. Every pane is separated from its neighbours by a line called the pane border. Exactly one pane in a window is the active pane, the one where typed text goes and the default target for commands; its border is marked in green, or if the window only has two panes then the green half of the shared border marks which side is active. The sizes and positions of every pane in a window together are called the window layout.

The command that splits a window is `split-window`, bound to two keys. `C-b %` splits the active pane horizontally, giving you a pane on the left and one on the right. `C-b "` splits it vertically, giving you a pane above and one below. The naming is easy to get backwards: `-h` is "horizontal" because the two resulting panes sit side by side, not because the dividing line is horizontal. `-v` stacks them, with a horizontal line between.

Splitting does not just add a pane, it also changes which one is active: the new pane becomes the active pane, unless the command is told otherwise. That is why a second split lands where you want it without pressing any keys to move around first.

## Do this

1. You are attached to session `learn`, window 0, with one pane. Press `C-b %`. The window splits into two panes side by side. The green border marks the pane on the right as active.

2. With the right pane active, press `C-b "`. That pane splits into two, one above the other. You now have three panes: one on the left, and two stacked on the right.

3. Look at the borders. The bottom-right pane carries the green marking, since it was the last one created.

**Done when** window 0 has three panes: one spanning the left, and two stacked on the right.

## What just happened

`C-b %` ran `split-window -h`, cutting the single pane into a left pane and a right pane and making the right one active. `C-b "` then ran `split-window -v` on that active pane, cutting it into a top pane and a bottom pane and making the bottom one active. Two splits, three panes, one window layout.

A common mistake is pressing `C-b` and then trying to hold Ctrl down for the `%`, which needs Shift+5. Release Ctrl (and `b`) after the prefix, then press Shift+5 or `"` on their own. Holding Ctrl through the second key sends nothing tmux recognises as the split command.

Each pane created this way can be split again with the same two keys, left and right or top and bottom, until a pane gets too small to divide further.

## Go further

- From the command prompt (`C-b :`, Level 1, Task 4), the same two splits are the commands `split-window -h` and `split-window -v` typed out in full.
- Level 1, Task 8 covers the flags `split-window` takes, including one that keeps the pane you started in active instead of switching to the new one.
