---
title: "Mark and swap panes"
slug: "mark-and-swap-panes"
summary: "Swap neighbouring panes with braces, then mark a pane and swap it with the active one from the prompt."
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
objective: "Rearrange panes A, B, C into the order C, A, B from left to right and clear the mark."
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
  - "There are two ways to swap: `C-b }` swaps the active pane with its neighbour; marking a pane with `C-b m` then running `:swap-pane` swaps it with whatever pane is active."
  - "Move to pane C, mark it with `C-b m`, then move to pane A and run `:swap-pane`. C and A trade places."
  - "With C, B, A left to right, move to pane B and press `C-b }` to swap it with A. Then press `C-b M` to clear the mark."
  - "Full route: on C press `C-b m`; move to A, open the prompt with `C-b :`, type `swap-pane`, press Enter; move to the middle pane and press `C-b }`; finish with `C-b M`."
---

Three panes end up in the wrong order more often than you would think: one closes, a new one opens on the wrong side, or you just want the busiest pane on the left. Moving the programs themselves is slow. tmux instead swaps the panes and leaves everything running.

## Concept

The `swap-pane` command exchanges the contents of two panes: sizes and positions stay put, but what each pane runs moves. `C-b }` and `C-b {` are shortcuts for it that swap the active pane with the next or previous pane by position, without asking which one.

For an arbitrary pair, tmux uses a marked pane. Only one pane can be marked at a time, across the whole server. `C-b m` toggles the mark on the active pane; `C-b M` clears the mark entirely, wherever it is. A marked pane gets a green border and the window holding it shows an `M` flag in the status line, so you can always see where the mark sits.

With a pane marked, running `swap-pane` with no arguments swaps it with the active pane. If nothing is marked, `swap-pane` instead swaps the active pane with the next one, the same as `C-b }`. The pane title and its running program travel with the pane when it moves; the pane index does not, since indexes number positions in the window, not panes.

## Do this

1. Attach and look at the three panes. Left to right they are titled A, B, C, shown in the pane border.

2. Move to pane C, then mark it.

   Press `C-b Right` twice to reach pane C, then press `C-b m`. Its border turns green and the status line shows an `M` flag.

3. Move to pane A and swap it with the marked pane from the command prompt.

   Press `C-b Left` twice to reach pane A, then press `C-b :`, type `swap-pane`, and press Enter. C and A trade places: left to right is now C, B, A.

4. Move to the middle pane and swap it with its neighbour on the right.

   Press `C-b Right` once to reach pane B, then press `C-b }`. B and A trade places: left to right is now C, A, B.

5. Clear the mark.

   Press `C-b M`. The green border and the `M` flag disappear.

**Done when** the panes read C, A, B from left to right and no pane is marked.

## What just happened

`C-b m` runs `select-pane -m`, which marks the active pane; `C-b M` runs `select-pane -M`, which clears the mark wherever it is. Step 3's `swap-pane` had a marked pane to work with, so it swapped that pane (C) with the active pane (A) and left the mark on C in its new spot. Step 4's `C-b }` runs `swap-pane -D`, which ignores the mark and swaps the active pane with the next one by position; `C-b {` is `swap-pane -U` for the previous one.

Watching the titles rather than the pane numbers shows what actually moved. `list-panes -F '#{pane_index}:#{pane_title}'` still reports positions 0, 1 and 2, but the title in each position changed as the panes swapped, because a title belongs to a pane, not to a slot in the window.

## Go further

- `swap-pane` takes explicit `-s` (source) and `-t` (destination) targets, so two panes can be swapped without marking either one: `:swap-pane -s learn:0.0 -t learn:0.2`.
- Add `-d` to any of these to swap without also moving the active pane to the destination.
- `swap-window` does the same job one level up, trading the positions of two whole windows in the window list.
