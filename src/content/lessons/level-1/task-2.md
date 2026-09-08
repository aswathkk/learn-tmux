---
title: "The prefix key and new windows"
slug: "prefix-key-and-new-windows"
summary: "Press the prefix key for the first time to open new windows and watch the window list grow in the status line."
level: 1
task: 2
difficulty: beginner
estimatedMinutes: 3
concepts: [prefix, window, window-index, current-window, status-line]
keys:
  - key: "C-b c"
    command: "new-window (neww)"
    description: "Create a new window at the first free index and make it current"
  - key: "C-b C-b"
    command: "send-prefix"
    description: "Send a literal C-b to the program in the active pane"
wikiSections: ["The prefix key", "Creating new windows", "The status line", "Sessions, windows and panes"]
challenge: false
objective: "Open two more windows in session learn so that the session has three windows and window 2 is current."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: three-windows
    description: "Session learn has three windows"
    kind: tmux
    command: "display-message -p -t learn '#{session_windows}'"
    expect: "^3$"
  - id: window-2-current
    description: "Window 2 is the current window of session learn"
    kind: tmux
    command: "display-message -p -t learn '#{window_index}'"
    expect: "^2$"
hints:
  - "The prefix is `C-b`: press Ctrl and b together, then release both before pressing the next key."
  - "`C-b c` runs `new-window`. It opens one window and makes it current, so press it more than once to get more windows."
  - "You need two more windows on top of window 0. Press `C-b c` twice and watch the window list read `0:shell 1:sh- 2:sh*`."
---

Session `learn` still has a single window. Everything else in this course starts with opening more of them, and that means using the prefix key for the first time.

## Concept

Once a client is attached, any key you type goes straight to the active pane, the program running in the current window. tmux itself only listens after you press the prefix key first. By default the prefix is `C-b`, the `Ctrl` key and `b` together.

Key combinations in tmux are written with a space between the parts: `C-b c` means press `C-b`, release both keys, then press `c`. This matters because `C-b c` is not the same as `C-b C-c`, where `Ctrl` stays held for the `c` too and a different command runs. `C-` is the control key, `M-` is meta (usually `Alt`), and `S-` is shift; they combine, as in `C-M-x`.

Each window in a session has a number, its window index, starting at 0. A session's window list is its windows in index order, and one of them is always the current window: the one shown on screen and the default target for commands. When you switch, the previous current window becomes the last window.

`C-b c` runs the `new-window` command. It creates a window at the first free index and makes that window current. The status line's window list grows to show it, with `*` marking the current window and `-` marking the last one, for example `0:shell 1:sh-  2:sh*`. Pressing the prefix twice, `C-b C-b`, does something different: it runs `send-prefix`, which forwards a literal `C-b` to the active pane instead of waiting for a command key.

## Do this

1. You are attached to `learn`. The status line reads `[learn]` and the window list shows only `0:shell*`.
2. Press `C-b c`: press `Ctrl` and `b` together, release both, then press `c`. A new window opens and the window list grows to `0:shell  1:sh*`.
3. Press `C-b C-b`. The window list does not change: the active pane, not tmux, receives a literal `C-b` this time.
4. Press `C-b c` again. A third window opens. The window list now reads `0:shell  1:sh-  2:sh*`.
5. Read the window list. Window 2 carries the `*` and is current. Window 1 carries the `-`, the last window you were on.

**Done when** session `learn` has three windows and window 2 is the current one.

## What just happened

Each `C-b c` ran `new-window` at the first free index, so the second window became index 1 and the third became index 2, and each one became current the moment it was created. A window is named after whatever program is running in it, so both new windows show `sh` until Level 2, Task 2 covers renaming them.

`C-b C-b` did not open a window because it runs a different command, `send-prefix`: the second `C-b` reaches the shell as ordinary input instead of tmux treating it as another key binding. This is also why `C-b c` and `C-b C-c` differ: releasing `Ctrl` before `c` runs `new-window`, holding it through `c` does not.

## Go further

- If there are more windows than fit the terminal's width, the status line shows `<` or `>` at the edges to mark hidden ones.
- Level 1, Task 4 shows the command prompt, where `new-window` takes flags directly: `-d` creates a window without switching to it, `-n` names it, and `-t` picks its index.
