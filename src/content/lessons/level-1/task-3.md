---
title: "Find any key with the help list"
slug: "find-any-key-help-list"
summary: "Open the built-in key list in view mode, scroll it, look up a single key, then use a key you found there."
level: 1
task: 3
difficulty: beginner
estimatedMinutes: 4
concepts: [help, view-mode, key-binding, mode-keys]
keys:
  - key: "C-b ?"
    command: "list-keys -N"
    description: "Show every key binding with its description in view mode (Up, Down, C-Up, C-Down scroll; q exits)"
  - key: "C-b /"
    command: "command-prompt -k ... list-keys -1N"
    description: "Prompt for one key and show its description in the status line"
  - key: "C-b t"
    command: "clock-mode"
    description: "Show a clock in the active pane (found through the help list; q exits). From the man page, not the wiki"
wikiSections: ["Help keys", "Other documentation and help"]
challenge: false
objective: "Open the key list with C-b ?, find the key described as Show a clock, then leave the pane showing the clock."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: help-list-open
    description: "The active pane of window 0 in session learn is showing the key list in view mode"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_mode}'"
    expect: "^view-mode$"
  - id: clock-mode-shown
    description: "The active pane of window 0 in session learn is showing the clock in clock mode"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_mode}'"
    expect: "^clock-mode$"
hints:
  - "Press `C-b ?` to open the full key list. It fills the pane; scroll with `Down` or `C-Down`."
  - "Look down the list for the row for `C-b t`. Its description reads `Show a clock`."
  - "Press `q` first to leave the list, then press `C-b t`. Pressing `t` while the list is still open just scrolls it."
  - "`C-b t` runs `clock-mode`. Leave the pane showing the clock; do not press `q` again afterward."
---

You know two key bindings by heart now, but tmux ships with dozens more. `C-b ?` and `C-b /` let you look any of them up without leaving the terminal.

## Concept

Every default tmux key binding carries a short description of what it does. `C-b ?` shows a list of all the keys and their descriptions at once.

A list that size does not fit on the status line, so tmux fills the whole pane with it and puts the pane into view mode, a mode for reading text much like copy mode. View mode has its own key bindings that need no prefix, mostly borrowed from *emacs(1)*: `Up`, `Down`, `C-Up` and `C-Down` scroll, and `q` leaves the mode. The top right corner shows the current line number against the total.

`C-b /` is more direct. It opens a prompt at the bottom of the screen, and the next key you press has just its own description shown in the same place. Pressing `C-b /` then `?` shows `C-b ? List key bindings`.

The same information exists outside tmux too: `tmux lsk -N | more` from the shell shows the same list, `man 1 tmux` documents every command, flag and option, and the FAQ wiki page and the tmux-users mailing list cover common questions the manual does not.

## Do this

1. You are attached to `learn`. The window list reads `0:shell*` and nothing else is open.
2. Press `C-b /`, then press `?`. The status line shows `C-b ? List key bindings`, the description for the key you just pressed.
3. Press `C-b ?`. The pane fills with every key binding and its description, and you are now in view mode.
4. Scroll down with `Down` or `C-Down` until you find the row for `C-b t`. Its description reads `Show a clock`.
5. Press `q`. View mode ends and the pane returns to the plain shell.
6. Press `C-b t`. The pane fills with a large clock. Leave it there.

**Done when** the pane has shown the key list in view mode, and now shows the clock.

## What just happened

`C-b ?` runs `list-keys -N`. Because the output is too long for the status line, tmux puts the pane into view mode instead of printing over the shell; `q` ends the mode the same way it ends copy mode, and the pane goes back to normal.

`C-b /` runs `command-prompt -k`, which reads one key press and turns it into a key name, then feeds it to `list-keys -1N` so only that key's description is shown. The prompt appears on the status line, not in the pane, so the pane's mode never changes.

`C-b t` runs `clock-mode`, the command whose description you found in the list. The wiki does not mention it; the man page just says it displays a large clock. Like view mode, it takes over the pane, though it is its own mode, separate from view mode.

## Go further

- `q` also leaves clock mode, the same key that leaves view mode.
- The `clock-mode-style` option switches the clock between 12-hour and 24-hour display, and `clock-mode-colour` sets its colour.
- `list-keys` (alias `lsk`) takes a `-T` flag to list one key table instead of everything, useful once later tasks introduce tables besides the prefix table.
