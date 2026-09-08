---
title: "Zoom a pane"
slug: "zoom-a-pane"
summary: "Make one pane fill the window temporarily and see the Z flag in the status line."
level: 2
task: 4
difficulty: intermediate
estimatedMinutes: 3
concepts: [zoom, window-zoomed-flag, status-flags]
keys:
  - key: "C-b z"
    command: "resize-pane -Z"
    description: "Toggle zoom: the active pane fills the window, press again to restore"
wikiSections: ["Resizing and zooming panes", "The status line"]
challenge: false
objective: "Pane B is zoomed, filling window 0."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux set-option -g pane-border-status top"
  - "tmux split-window -h -t learn:0.0"
  - "tmux split-window -v -t learn:0.1"
  - "tmux select-pane -t learn:0.0 -T A"
  - "tmux select-pane -t learn:0.1 -T B"
  - "tmux select-pane -t learn:0.2 -T C"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: pane-b-zoomed
    description: "Window 0 of session learn is zoomed with pane 1 (B) active"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_zoomed_flag}:#{pane_index}'"
    expect: "^1:1$"
hints:
  - "Zoom acts on the active pane. Move to B first, or you zoom A."
  - "`C-b o` steps to the next pane by number: from A to B. Then `C-b z`."
  - "If nothing seems to change, look for `Z` after the window name in the status line. Do not press `C-b z` a second time at the end."
---

## Concept

`C-b z` zooms the active pane to fill the window; the other panes are hidden, not closed. Press it again to put everything back. A zoomed window shows `Z` after its name in the status line.

Zoom is a temporary view over the layout: unzooming restores every pane to its exact size. Anything that changes the layout, such as resizing a pane or applying a preset layout, unzooms the window first, so zoom last.

`*`, `-` and `Z` are window flags, and more than one can show at once.

## Do this

Pane A on the left is active; B is top right, C bottom right.

1. Press `C-b o`. B is active.
2. Press `C-b z`. B fills the window, A and C vanish, and the list shows `0:editor*Z`.
3. Press `C-b z` twice. B shrinks back and A and C return, then B fills the window again. Leave it zoomed.

## What just happened

`C-b z` runs `resize-pane -Z`, a toggle on the active pane. Nothing about the split changed while B was zoomed, which is why unzooming restored the three-pane layout exactly.

## Go further

- `resize-pane -Z -t 1` zooms a pane by number from the prompt, without moving to it.
