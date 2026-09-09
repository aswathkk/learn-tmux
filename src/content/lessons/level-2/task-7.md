---
title: "Mark and swap panes"
slug: "mark-and-swap-panes"
summary: "Swap neighbouring panes with braces, then mark a pane and swap it with the active one from the prompt."
seoDescription: 'Swap neighbouring tmux panes with C-b { and C-b }, then mark a pane with C-b m and swap it with the active one from another window.'
level: 2
task: 7
difficulty: intermediate
estimatedMinutes: 4
concepts: [marked-pane, swap-pane, pane-index]
keys:
  - key: "C-b }"
    command: "swap-pane -D (C-b { is swap-pane -U)"
    description: "Swap the active pane with the next (or previous) pane"
  - key: "C-b m"
    command: "select-pane -m (C-b M is select-pane -M)"
    description: "Toggle the marked pane; M clears the mark entirely"
  - key: ":swap-pane"
    command: "swap-pane"
    description: "Swap the marked pane with the active pane"
wikiSections: ["Swapping and moving", "Summary of terms"]
challenge: false
objective: "Panes read C, A, B from left to right and no pane is marked."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux set-option -g pane-border-status top"
  - "tmux split-window -h -t learn:0"
  - "tmux split-window -h -t learn:0"
  - "tmux select-layout -t learn:0 even-horizontal"
  - "tmux select-pane -t learn:0.0 -T A"
  - "tmux select-pane -t learn:0.1 -T B"
  - "tmux select-pane -t learn:0.2 -T C"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: order-cab
    description: "Window 0 of session learn holds panes titled C, A, B in that order"
    kind: tmux
    command: "list-panes -t learn:0 -F '#{pane_index}:#{pane_title}'"
    expect: "^0:C\\n1:A\\n2:B$"
  - id: no-mark-left
    description: "No pane is marked once the rearrange is done"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_marked_set}'"
    expect: "^0$"
hints:
  - "`swap-pane` with no arguments uses the marked pane. Mark C first, then run it from A."
  - "`C-b m` marks the active pane; `C-b }` swaps the active pane with its right neighbour; `C-b M` clears the mark."
  - "On C press `C-b m`; move to A, `C-b :` `swap-pane`; move to the middle pane, `C-b }`; then `C-b M`."
---

## Concept

`C-b }` swaps the active pane with the next one, `C-b {` with the previous. For any two panes: `C-b m` marks one, then `swap-pane` at the prompt swaps the marked pane with the active one. `C-b M` clears the mark.

Swapping moves what runs in a pane, not the pane's slot: sizes and positions stay, programs and titles trade places. Pane numbers belong to positions, so a number does not travel with the program.

One pane on the whole server can be marked at a time. Its border turns green and the window gets an `M` flag. Without a mark, `swap-pane` behaves like `C-b }`.

## Do this

Left to right the panes are titled A, B, C; A is active.

1. Press `C-b Right` twice to reach C, then `C-b m`. Its border turns green; the list shows `M`.
2. Press `C-b Left` twice to reach A. Press `C-b :`, type `swap-pane`, Enter. The order is now C, B, A.
3. Press `C-b Right` to reach B, then `C-b }`. The order is C, A, B.
4. Press `C-b M`. The mark and the `M` flag go.

## What just happened

`C-b m` runs `select-pane -m`; `C-b M` runs `select-pane -M`. `swap-pane` used the mark as its source and the active pane as its target. `C-b }` runs `swap-pane -D`, which ignores the mark and takes the next pane. The titles moved with the programs; positions 0, 1 and 2 stayed where they were.

## Go further

- `swap-pane -s 0.0 -t 0.2` names both panes and needs no mark.
- `-d` swaps without moving the active pane.
- `swap-window` does the same for whole windows.
