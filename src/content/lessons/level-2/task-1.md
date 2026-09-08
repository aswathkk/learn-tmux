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
objective: "Visit window 3 and end with window 0 current and window 3 as the last window."
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
  - "Jump straight to any window with `C-b` and its index: `C-b 3` goes to window 3."
  - "`C-b n` moves to the next window by index, `C-b p` to the previous one."
  - "`C-b l` goes to the last window: whichever window was current right before this one."
  - "The route is `C-b 3`, `C-b n`, `C-b p`, `C-b 0`, then `C-b l` twice. From window 0 the first `C-b l` lands on window 3, not back on 0, so you need the second press."
---

Session `learn` now has five windows: `editor`, `server`, `logs`, `tests` and `docs`. Stepping through them one at a time works, but jumping straight to the one you need, and back again, is faster.

## Concept

Every session tracks one current window: the window where typing goes. The status line's window list marks it with a `*` after its name. Each window also has a window index, its position number in that list, starting at 0 and counting up as you add windows.

tmux also remembers the last window: whichever window was current right before the one that is current now. The status line marks the last window with a `-`. Switch windows again and the last window changes too. It is always just one step back, not a history of everywhere you have been.

`C-b 0` through `C-b 9`, `C-b n`, `C-b p` and `C-b l` are all variations of one command, `select-window`. Each just names the target a different way: by index, by stepping forward or back through the window list, or by asking for the last window.

## Do this

1. Look at the status line. It reads `0:editor* 1:server 2:logs 3:tests 4:docs`: window 0, `editor`, is current.
2. Press `C-b 3`. Window `tests` becomes current, and the list reads `...3:tests*...`.
3. Press `C-b n`. tmux moves to the next window by index: window 4, `docs`.
4. Press `C-b p`. tmux moves to the previous window by index, back to window 3, `tests`.
5. Press `C-b 0`. Window 0, `editor`, is current again. Window 3 is now the last window, marked `3:tests-` in the list.
6. Press `C-b l`. tmux jumps to the last window, window 3. Window 0 is now the last window.
7. Press `C-b l` again. tmux jumps back to window 0. Window 3 is the last window once more.

**Done when** window 0 is current and window 3 is the last window.

## What just happened

`C-b 3` ran `select-window` targeting window index 3; `C-b 0` up to `C-b 9` do the same for whichever digit you press. `C-b n` and `C-b p` are equivalent to `next-window` and `previous-window`, which move through the window list by number instead of jumping straight to an index. `C-b l` ran `last-window`, which switches to whichever window the session remembers as current immediately before this one.

The last window updates on every switch, so `C-b l` twice in a row does not repeat the same jump. From window 0, the first `C-b l` goes to window 3 because that was the last window at that point, and doing so makes window 0 the new last window. The second `C-b l` reads that updated value and goes back to window 0, with window 3 last again.

## Go further

- Run the same command from the prompt: press `C-b :`, type `select-window -t 3`, and press Enter.
- Preview: `C-b '` prompts for a window index directly, useful once a session has more than nine windows. A later lesson covers it.
