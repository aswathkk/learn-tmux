---
title: "Move between panes"
slug: "move-between-panes"
summary: "Change the active pane with the arrow keys, cycle with o, and jump by number with q."
seoDescription: 'Move between tmux panes with C-b and the arrow keys, cycle through them with C-b o, and jump straight to one by number with C-b q.'
level: 1
task: 9
difficulty: beginner
estimatedMinutes: 4
concepts: [active-pane, pane-index, navigation]
keys:
  - key: "C-b Up"
    command: "select-pane -U (also Down -D, Left -L, Right -R)"
    description: "Make the pane above, below, left or right the active pane; wraps around"
  - key: "C-b o"
    command: "select-pane -t :.+"
    description: "Move to the next pane by number"
  - key: "C-b q"
    command: "display-panes"
    description: "Show pane numbers briefly; press a number to jump to that pane"
wikiSections: ["Changing the active pane", "Summary of terms"]
challenge: false
objective: "Visited pane C, then A, and finished with B active."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux set -g pane-border-status top"
  - "tmux split-window -h -t learn:0"
  - "tmux split-window -v -t learn:0"
  - "tmux select-pane -t learn:0.0 -T A"
  - "tmux select-pane -t learn:0.1 -T B"
  - "tmux select-pane -t learn:0.2 -T C"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: visit-pane-c
    description: "Pane C (index 2) is the active pane in window learn:0"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^2$"
  - id: return-to-pane-a
    description: "Pane A (index 0) is the active pane in window learn:0"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^0$"
  - id: finish-on-pane-b
    description: "Pane B (index 1) is the active pane in window learn:0, the final state"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^1$"
hints:
  - "Release Ctrl before the arrow. `C-b C-Left` resizes instead of moving."
  - "`C-b q` shows a number on each pane for a moment; press the digit before it fades. A is 0, B is 1, C is 2."
  - "`C-b q` `2` to reach C, `C-b Left` to reach A, `C-b o` to reach B."
---

## Concept

Three ways to change the active pane, each useful at a different moment:

- `C-b Left` / `Right` / `Up` / `Down` — step one pane in that direction
- `C-b q` then a digit — jump straight to a numbered pane
- `C-b o` — step to the next pane by number

Panes are numbered by position from 0, not by the order they were made. Directional moves wrap at the edges of the window, so `C-b Left` on the leftmost pane lands on the rightmost.

## About the A, B, C labels

The pane borders in this task show A, B and C so the steps can name them. That label is the pane title, not its number.

## Do this

Pane A on the left is active; B is top right, C bottom right.

1. Press `C-b q`, then `2` while the numbers show.

   C is active.

2. Press `C-b Left`.

   A is active.

3. Press `C-b o`.

   B, the next pane by number, is active.

## What just happened

`C-b q` runs `display-panes`, which waits for a digit and then runs `select-pane` on that pane. The arrows run `select-pane -L`, `-R`, `-U`, `-D`. `C-b o` runs `select-pane -t :.+`, "the next pane".

## Go further

- `select-pane -t 2` at the prompt jumps by number without the overlay.
- `C-b C-o` rotates every pane one position instead of moving focus.
