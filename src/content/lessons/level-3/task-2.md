---
title: "Scroll, search the scrollback and paste"
slug: "search-scrollback-and-paste"
summary: "Scroll back through long output, search for a request id, copy it and paste it into another pane."
seoDescription: 'Scroll a long tmux scrollback, search it with C-r, copy the line you were looking for, and paste it into another pane with C-b ].'
level: 3
task: 2
difficulty: advanced
estimatedMinutes: 4
concepts: [scrollback, search, paste, history]
keys:
  - key: "C-Up"
    command: "send-keys -X scroll-up (copy mode; C-Down scrolls down, PageUp and PageDown page)"
    description: "Scroll the history without moving the cursor line by line"
  - key: "C-r"
    command: "send-keys -X search-backward-incremental (copy mode)"
    description: "Search backwards through the history as you type; Enter stops at the match, C-g cancels"
  - key: "C-b ]"
    command: "paste-buffer"
    description: "Paste the most recent buffer into the active pane"
wikiSections: ["Copy and paste", "Help keys"]
challenge: false
objective: "The request id from the buried `ERROR` line is pasted into the right pane."
setup:
  - "seq 1 240 > /home/alpine/server.log"
  - "printf 'ERROR request-id=req-51c2e9a7d4 failed\\n' >> /home/alpine/server.log"
  - "seq 241 400 >> /home/alpine/server.log"
  - "tmux new-session -d -s learn -n logs -x 120 -y 36"
  - "tmux split-window -h -t learn:0"
  - "tmux send-keys -t learn:0.0 'cat ~/server.log' Enter"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: scrolled-back
    description: "The left pane is in copy mode, scrolled at least 50 lines up from the bottom"
    kind: tmux
    command: "display-message -p -t learn:0.0 '#{scroll_position}'"
    expect: "^([5-9][0-9]|[1-9][0-9]{2})$"
  - id: buffer-has-request-id
    description: "A paste buffer contains the request id from the ERROR line"
    kind: tmux
    command: "list-buffers -F '#{buffer_sample}'"
    expect: "req-51c2e9a7d4"
  - id: pasted-into-right-pane
    description: "The request id was pasted into the shell in the right pane"
    kind: tmux
    command: "capture-pane -p -t learn:0.1"
    expect: "req-51c2e9a7d4"
hints:
  - "Search backward, not forward: from the bottom of the history everything is above the cursor."
  - "`C-b [`, then hold `C-Up` until the counter passes 50. `C-r`, type `ERROR`, Enter jumps to the line."
  - "On the line: `C-a`, `C-Space`, `C-e`, `M-w`. Then `C-b o`, type `echo `, `C-b ]`, Enter."
---

## Concept

In copy mode, `C-Up` and `C-Down` scroll the history a line at a time without moving the cursor on screen; `PageUp` and `PageDown` a screen at a time. `C-r` searches backward as you type. `C-b ]` pastes the newest buffer into the active pane.

Lines that scroll off the top go into the pane's scrollback, kept up to the `history-limit` option. The counter at the top right of copy mode shows how far up you are.

`C-r` is incremental: the cursor jumps to the nearest match above on every keystroke. Enter stops there; `C-g` cancels and returns you. `n` and `N` repeat the search.

## Do this

1. Press `C-b [`, then hold `C-Up` until the counter passes 50.
2. Press `C-r`, type `ERROR`, Enter. The cursor lands on `ERROR request-id=req-51c2e9a7d4 failed`.
3. Press `C-a`, `C-Space`, `C-e`, `M-w`. The line is copied and copy mode ends.
4. Press `C-b o`, type `echo ` with a trailing space, press `C-b ]`, then Enter. The line prints in the right pane.

## What just happened

`C-Up` and `C-r` are `scroll-up` and `search-backward-incremental`, sent with `send-keys -X`. `C-b ]` runs `paste-buffer`, which types the newest buffer into the active pane as if you had typed it, so it landed after `echo `.

## Go further

- `M-f` and `M-b` move by word, to select just `req-51c2e9a7d4` instead of the line.
- `history-limit` sets how many scrollback lines a pane keeps.
