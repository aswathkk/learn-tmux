---
title: "Find any key with the help list"
slug: "find-any-key-help-list"
summary: "Open the built-in key list in view mode, scroll it, look up a single key, then use a key you found there."
seoDescription: 'Press C-b ? for the tmux key binding list, scroll it in view mode, look up a single key with C-b /, then use what you found. No memorising.'
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
    description: "Show a clock in the active pane; q exits"
wikiSections: ["Help keys", "Other documentation and help"]
challenge: false
objective: "The pane has shown the key list, and now shows the clock."
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
  - "Press `q` to leave the list before pressing `C-b t`. Inside the list, `t` only scrolls."
  - "`C-b ?` opens the list. Scroll with `Down` or `C-Down`; the row for `C-b t` reads `Show a clock`."
  - "`C-b ?`, find `Show a clock`, `q`, then `C-b t`. Leave the clock on screen."
---

## Concept

`C-b ?` fills the pane with every key binding and what it does. Scroll with `Down` or `C-Down`, leave with `q`. Anything you find there you can press straight away.

The list is too long for the status line, so tmux puts the pane into view mode: a read-only mode with its own keys that need no prefix. The top right corner shows your line number against the total.

`C-b /` asks for one key and shows only its description on the status line. From the shell, `tmux lsk -N` prints the same list, and `man tmux` documents every command and option.

## Do this

1. Press `C-b ?`. The pane fills with key bindings; the top right shows a line counter.
2. Scroll down with `Down` or `C-Down` until you find the row for `C-b t`: `Show a clock`.
3. Press `q` to leave the list, then `C-b t`. A large clock fills the pane. Leave it there.

## What just happened

`C-b ?` runs `list-keys -N` and shows the result in view mode. `C-b t` runs `clock-mode`, which takes over the pane the same way; `q` leaves either mode. Every default key has a one-line description, so the list is the fastest way to find a key you half remember.

## Go further

- `C-b /` then a key shows just that key's description, without opening the list.
- `clock-mode-style` switches the clock between 12 and 24 hours; `clock-mode-colour` sets its colour.
- `list-keys -T prefix` lists one key table instead of all of them.
