---
title: "Change the current window"
slug: "switch-windows"
summary: "Jump to windows by index, step through them with next and previous, and bounce to the last window."
level: 2
task: 1
difficulty: intermediate
estimatedMinutes: 3
concepts: [current-window, last-window, window-index, select-window]
keys:
  - key: "C-b 3"
    command: "select-window -t :=3 (C-b 0 to C-b 9)"
    description: "Change to the window with that index"
  - key: "C-b n"
    command: "select-window -n (C-b p is -p)"
    description: "Change to the next window by index; p goes to the previous"
  - key: "C-b l"
    command: "last-window"
    description: "Change to the window that was current before this one"
wikiSections: ["Changing the current window", "Summary of terms", "The status line"]
challenge: false
objective: "Window 0 is current and window 3 is the last window."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux new-window -d -t learn -n server"
  - "tmux new-window -d -t learn -n logs"
  - "tmux new-window -d -t learn -n tests"
  - "tmux new-window -d -t learn -n docs"
startCommand: "tmux attach -t learn"
checks:
  - id: window-3-visited
    description: "Window 3 becomes the current window of session learn"
    kind: tmux
    command: "display-message -p -t learn '#{window_index}'"
    expect: "^3$"
  - id: window-0-current-3-last
    description: "Window 0 is current and window 3 is the last window"
    kind: tmux
    command: "list-windows -t learn -F '#{window_index}:#{window_active}:#{window_last_flag}'"
    expect: "^0:1:0$[\\s\\S]*^3:0:1$"
hints:
  - "`C-b l` toggles between the current window and the one before it, so pressing it twice returns you to where you started."
  - "`C-b 3` jumps to window 3; `C-b n` and `C-b p` step forward and back; `C-b 0` returns to window 0."
  - "`C-b 3`, `C-b n`, `C-b p`, `C-b 0`, then `C-b l` twice."
---

## Concept

`C-b 0` to `C-b 9` jump to a window by index. `C-b n` and `C-b p` step to the next and previous. `C-b l` goes to the last window, the one that was current before this one, and back again.

The status line marks the current window with `*` and the last window with `-`. The last window updates on every switch, so it is one step of history, not a stack.

All of these run `select-window` with a different target: an index, the next or previous one, or the remembered last window.

## Do this

1. Press `C-b 3`. `tests` is current: `3:tests*`.
2. Press `C-b n`, then `C-b p`. To `docs` and back to `tests`.
3. Press `C-b 0`. `editor` is current and `3:tests-` marks the last window.
4. Press `C-b l` twice. First to `tests`, then back to `editor`, with `tests` last again.

## What just happened

`C-b l` runs `last-window`, which reads the remembered window and switches to it. Switching also updates the memory, which is why the second press brought you back: after the first, window 0 had become the last window.

## Go further

- `select-window -t 3` at the prompt does the same as `C-b 3`.
- `C-b '` prompts for an index, useful past window 9.
