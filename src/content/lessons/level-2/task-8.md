---
title: "Move and renumber windows"
slug: "move-and-renumber-windows"
summary: "Move a window to a new index, swap two windows using the marked pane, and close the gaps."
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
objective: "Turn the window list 0:logs 1:editor 3:tests 7:shell into 0:editor 1:logs 2:tests 3:shell."
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
  - "Move a window with `C-b .`, then type the new index and press Enter. Mark a pane with `C-b m` before swapping its window with `:swap-window`."
  - "Go to window `tests`, press `C-b .`, type `2`, press Enter. Then go to `editor`, press `C-b m` to mark its pane. Switch to `logs`, open the prompt with `C-b :`, and run `swap-window`."
  - "After the swap, windows still sit at 0, 1, 2, 7. Open the prompt with `C-b :` and run `movew -r` to close the gap."
  - "Order matters: mark `editor`'s pane while `editor` is the active window, then switch to `logs` before running `swap-window` - the command swaps the marked pane's window with whatever window is current."
---

The window list from Level 2, Task 7 has gaps and the wrong order: logs at 0, editor at 1, tests at 3, shell at 7. This task closes the gaps and puts editor first, without closing or recreating a single window.

## Concept

A window's index is just a position in the window list, and tmux gives you commands to change it directly instead of closing and reopening windows. `move-window`, bound to `C-b .`, prompts for a new index and puts the current window there. If a window already exists at that index, tmux refuses and shows an error; the `-k` flag would replace it instead.

`swap-window` exchanges two windows' positions using the marked pane from Level 2, Task 7. Mark a pane in the window you want to move, switch to the window you want to swap it with, then run `swap-window`. The window holding the marked pane trades places with the current window; nothing about their contents changes, only their index and position in the status line.

After a move or a swap the window list can still have gaps, like 0, 1, 2, 7. Passing `-r` to `move-window` renumbers every window in the target session in order, starting from 0, so the gaps disappear.

## Do this

1. Switch to the `tests` window (`C-b 3`, since it sits at index 3). Press `C-b .`, a command prompt opens asking for a target. Type `2` and press Enter. The window moves to index 2, since 2 was free.
2. Switch to the `editor` window (`C-b 1`). Press `C-b m` to mark its pane. The window list shows an `M` flag next to `editor`.
3. Switch to the `logs` window (`C-b 0`). Open the command prompt with `C-b :`, type `swap-window`, and press Enter.
4. Check the status line. `editor` now sits at index 0 and `logs` has moved to wherever `editor` used to be.
5. The window list is now 0:editor, 1:logs, 2:tests, 7:shell - still a gap at index 3. Open the command prompt with `C-b :`, type `movew -r`, and press Enter.
6. Read the window list. It reads 0:editor, 1:logs, 2:tests, 3:shell, with no gaps.

**Done when** the window list for session `learn` reads exactly `0:editor 1:logs 2:tests 3:shell` in that order.

## What just happened

`C-b .` ran `move-window`, prompting for the target index and placing the current window there. Moving `tests` to index 2 worked because nothing else occupied it; moving it to an index that was already taken would have shown an error, since `move-window` never overwrites an existing window unless you add `-k`.

`C-b m` set the one marked pane tmux tracks across the whole server, and running `swap-window` from the `logs` window exchanged `logs` with whatever window held that marked pane, `editor`. The mark did not move or clear itself; you still had it set on the pane that is now at index 0.

`movew -r` is `move-window -r`, the renumber flag. It walked every window in the session and reassigned indexes starting from 0, closing the gap left at index 3. Level 4, Task 1 covers the `renumber-windows` option, which runs this automatically whenever a window closes.

## Go further

- `move-window -s src -t dst` moves a window from one session to another; without `-s` it always acts on the current window.
- `swap-window -s src -t dst` can swap by target instead of using the mark, useful when scripting from outside tmux.
- `swap-window -d` swaps windows without also switching which one is current, so you stay on the window you ran the command from.
