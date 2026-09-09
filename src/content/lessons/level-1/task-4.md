---
title: "Run commands from the command prompt"
slug: "tmux-command-prompt"
summary: "Use the tmux command prompt to run new-window with flags instead of a key binding."
seoDescription: 'Open the tmux command prompt with C-b : and run new-window with its own flags — a name, no switch, a program — instead of reaching for a key.'
level: 1
task: 4
difficulty: beginner
estimatedMinutes: 3
concepts: [command-prompt, commands, flags, aliases]
keys:
  - key: "C-b :"
    command: "command-prompt"
    description: "Open the tmux command prompt in place of the status line (Enter runs, Escape cancels)"
  - key: ":neww -d -n name"
    command: "new-window -d -n"
    description: "Create a named window without making it current"
  - key: ":neww command"
    command: "new-window <command>"
    description: "Create a window running a program instead of a shell"
wikiSections: ["Commands and flags", "The command prompt", "Creating new windows"]
challenge: false
objective: "Session `learn` has a window `logs` that is not current, and a window running `top`."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: "window-logs-created"
    description: "Window logs exists in session learn and is not the current window"
    kind: tmux
    command: "list-windows -t learn -F '#{window_name}:#{window_active}'"
    expect: "^logs:0$"
  - id: "window-running-top"
    description: "A window in session learn is running the top program"
    kind: tmux
    command: "list-windows -t learn -F '#{pane_current_command}'"
    expect: "^top$"
hints:
  - "Type only the command at the prompt, not `tmux` in front of it."
  - "`neww` is short for `new-window`. `-d` opens it without switching; `-n name` names it. A word after the flags is a program to run."
  - "`C-b :` then `neww -d -n logs`, Enter. Then `C-b :` again, `neww top`, Enter."
---

## Concept

`C-b :` opens the command prompt in place of the status line. Type any tmux command with its flags, press Enter to run it, Escape to cancel. `C-b c` is just `new-window` with no flags; the prompt lets you add them.

Commands have a long name and usually an alias: `new-window` is `neww`, `new-session` is `new`, `list-keys` is `lsk`. Flags work as in the shell, and `;` separates several commands on one line.

A short result shows on the status line; longer output opens in view mode, which `q` closes.

## Do this

1. Press `C-b :`, type `neww -d -n logs`, press Enter. The list reads `0:shell* 1:logs`: the new window exists but `shell` stays current.
2. Press `C-b :`, type `neww top`, press Enter. A window running `top` opens and becomes current: `2:top*`.

## What just happened

`-d` kept the session on its current window, and `-n logs` named the new one instead of letting it take its program's name. A word after the flags is a program to run in place of the shell, so the second window runs `top`. Both went to the next free index, exactly as `C-b c` does.

## Go further

- `-t 9` puts the new window at index 9 instead of the next free one.
- `lsw` at the prompt prints the window list with more detail than the status line.
- Flags without values combine: `-dn logs` is `-d -n logs`.
