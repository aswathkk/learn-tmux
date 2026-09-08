---
title: "Run commands from the command prompt"
slug: "tmux-command-prompt"
summary: "Use the tmux command prompt to run new-window with flags instead of a key binding."
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
objective: "From the command prompt create a window named logs that is not current, and a window running top."
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
  - "Open the command prompt with `C-b :`. It replaces the status line while you type."
  - "The command is `new-window`, alias `neww`. `-d` skips switching to the new window; `-n name` sets its name."
  - "Type `:neww -d -n logs`, press Enter, then open the prompt again and type `:neww top`."
---

Every key binding runs a tmux command behind the scenes. Level 1, Task 2 showed `C-b c` running `new-window`. This task runs that same command from the command prompt instead, with flags no key binding can pass.

## Concept

tmux commands have a full name such as `new-window` or `new-session`, and most also have a short alias: `neww` for `new-window`, `new` for `new-session`, `lsk` for `list-keys`. A command takes zero or more flags, the same way a Unix command does. Some flags take an argument and some do not, and extra arguments can follow the flags.

The command prompt is an interactive line that replaces the status line so a command can be typed directly, the same way a command would be typed at the shell. Open it with `C-b :`. Pressing Enter runs the line; pressing Escape cancels it and restores the status line. By default the prompt uses *emacs(1)*-style editing keys.

Running a command from the prompt shows its result briefly in the status line, or switches the active pane into view mode if there is more to show. Several commands can be typed on one line separated by `;`, called a command sequence; this task types one command at a time.

## Do this

1. Press `C-b :`. The status line is replaced by a colon prompt.
2. Type `neww -d -n logs` and press Enter. `neww` is the alias for `new-window`; `-d` creates the window without making it current, and `-n logs` names it `logs`.
3. Look at the window list. It reads `0:shell* 1:logs`: window `logs` exists, and the `*` still marks `shell` as current.
4. Press `C-b :` again, type `neww top`, and press Enter. This runs `new-window` with the argument `top`, so the new window runs *top(1)* instead of a shell, and it becomes current because there is no `-d` this time.
5. Check the window list once more. It reads `0:shell 1:logs 2:top*`.

**Done when** window `logs` exists and is not current, and a window is running `top`.

## What just happened

`neww -d -n logs` ran `new-window` with two flags: `-d` so the session does not switch to the new window, and `-n logs` so it is named `logs` instead of after its program. Flags that take no argument of their own can be written together, so `-d -n logs` could also be typed `-dn logs`.

`neww top` ran `new-window` again, this time with a shell command as an argument. tmux ran `top` in the new pane in place of a shell. Both windows were added to session `learn` at the next free index, exactly as `C-b c` does; typing the command yourself just adds the flags.

## Go further

- `list-windows` (alias `lsw`) typed at the command prompt prints the same window list the status line shows, without a shell in the way.
- A `-t` flag targets a specific index: `:neww -t9` creates a window at index 9 instead of the next free one.
- Typing `tmux` at the command prompt is a common mistake. The prompt already talks to the server, so type the command name alone, and only one leading colon.
