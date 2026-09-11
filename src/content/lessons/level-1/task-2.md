---
title: "The prefix key and new windows"
slug: "prefix-key-and-new-windows"
summary: "Press the prefix key for the first time to open new windows and watch the window list grow in the status line."
seoDescription: 'Meet the tmux prefix key. Press C-b c to open new windows, watch the window list grow in the status line, and send C-b through with C-b C-b.'
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
objective: "Session `learn` has three windows and window 2 is current."
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
  - "Press Ctrl and b together, release both, then press `c`. Holding Ctrl through the `c` runs something else."
  - "`C-b c` opens one window and switches to it. You need two more."
  - "Press `C-b c` twice and watch the window list become `0:shell 1:sh- 2:sh*`."
---

## Concept

Keys go to the program in your pane until you press the prefix.
`C-b` — Ctrl and b together — makes the *next* key a tmux command instead. `C-b c` opens a new window and makes it current.

Release matters. A space in a key name means let go: `C-b c` is `C-b`, release, then `c`. Holding Ctrl through the `c` runs something else entirely.

Windows are numbered from 0, and the status line marks two of them:

- `*` — the current window
- `-` — the last window, the one you came from

## The full key notation

`C-` is Ctrl, `M-` is Meta (usually Alt), `S-` is Shift. The same notation appears in every tmux doc and in the key list.

## Do this

1. Press `C-b c`.

   A second window opens and the list reads `0:shell- 1:sh*`.

2. Press `C-b c` again.

   The list reads `0:shell 1:sh- 2:sh*` — window 2 is current, window 1 was last.

## What just happened

Each `C-b c` ran `new-window`, which creates a window at the first free index and switches to it. New windows are named after the program running in them, `sh`, until you rename them.

## Go further

- `C-b C-b` sends a literal `C-b` to the program in the pane, for when that program uses the key itself.
- When windows overflow the width of the status line, `<` and `>` mark the hidden ones.
- `new-window` also takes flags at the command prompt: `-d` to open without switching, `-n` to name it.
