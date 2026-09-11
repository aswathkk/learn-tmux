---
title: "Move and renumber windows"
slug: "move-and-renumber-windows"
summary: "Move a window to a new index, swap two windows using the marked pane, and close the gaps."
seoDescription: 'Move a tmux window to a free index with C-b ., swap two windows with swap-window, then close the gaps in the list with move-window -r.'
level: 2
task: 8
difficulty: intermediate
estimatedMinutes: 4
concepts: [move-window, swap-window, window-index, renumber]
keys:
  - key: "C-b ."
    command: "move-window (movew)"
    description: "Prompt for a new index for the current window"
  - key: ":swap-window"
    command: "swap-window"
    description: "Swap the window containing the marked pane with the current window"
  - key: ":movew -r"
    command: "move-window -r"
    description: "Renumber windows to remove gaps in the window list"
wikiSections: ["Swapping and moving", "Creating new windows"]
challenge: false
objective: "The window list reads `0:editor 1:logs 2:tests 3:shell`."
setup:
  - "tmux new-session -d -s learn -n logs -x 120 -y 36"
  - "tmux new-window -d -t learn:1 -n editor"
  - "tmux new-window -d -t learn:3 -n tests"
  - "tmux new-window -d -t learn:7 -n shell"
startCommand: "tmux attach -t learn"
checks:
  - id: tests-moved-to-2
    description: "The tests window has been moved to index 2"
    kind: tmux
    command: "display-message -p -t learn:2 '#{window_index}:#{window_name}'"
    expect: "^2:tests$"
  - id: windows-renumbered
    description: "The window list reads 0:editor 1:logs 2:tests 3:shell with no gaps"
    kind: tmux
    command: "list-windows -t learn -F '#{window_index}:#{window_name}'"
    expect: "^0:editor\\n1:logs\\n2:tests\\n3:shell$"
hints:
  - "`swap-window` swaps the window holding the marked pane with the current window. Mark in `editor`, then switch to `logs` before running it."
  - "`C-b .` prompts for a new index for the current window. `movew -r` renumbers to close gaps."
  - "On `tests`: `C-b .` `2` Enter. On `editor`: `C-b m`. On `logs`: `C-b :` `swap-window`. Then `C-b :` `movew -r`."
---

## Concept

An index is a slot in the window list. These three commands change slots without closing anything:

- `C-b .` — prompt for a new index for the current window
- `swap-window` at `C-b :` — trade the current window with the one holding the marked pane
- `movew -r` at `C-b :` — renumber every window from 0, closing the gaps

The mark is the same one from `C-b m`: mark a pane in the window you want to move, go to the window you want it to trade with, then run `swap-window`.

## Replacing an occupied index

`move-window` refuses an index that is already taken, unless you add `-k` to replace whatever is there.

## Do this

1. Press `C-b 3` to reach `tests`, then `C-b .`, type `2`, Enter.

   The list shows `2:tests`.

2. Press `C-b 1` to reach `editor`, then `C-b m`.

   Its pane is marked.

3. Press `C-b 0` to reach `logs`, then `C-b :`, type `swap-window`, Enter.

   `editor` is now at 0 and `logs` at 1.

4. Press `C-b :`, type `movew -r`, Enter.

   `7:shell` becomes `3:shell`, leaving `0:editor 1:logs 2:tests 3:shell`.

## What just happened

`C-b .` runs `move-window` with the index you typed. `swap-window` found the marked pane's window, `editor`, and exchanged it with the current one; the mark stays set afterwards. `move-window -r` walked the list and reassigned indexes in order.

## Go further

- `move-window -s other:1 -t 5` moves a window between sessions.
- `swap-window -s 0 -t 3` swaps by index without a mark; `-d` keeps you on the window you ran it from.
- The `renumber-windows` option makes tmux renumber automatically whenever a window closes.
