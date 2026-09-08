---
title: "Scroll, search the scrollback and paste"
slug: "search-scrollback-and-paste"
summary: "Scroll back through long output, search for a request id, copy it and paste it into another pane."
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
objective: "Scroll at least 50 lines up in the log pane, find the ERROR line hidden in 400 lines of output, copy its request id, and paste it into the shell in the right pane."
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
  - "Press `C-b [` on the left pane to enter copy mode, then hold `C-Up` to scroll up. Watch the counter at the top right pass 50."
  - "Press `C-r`, type `ERROR`, then press `Enter`. tmux jumps to the match as you type."
  - "At the match, press `C-a`, then `C-Space` to start a selection, `C-e` to reach the end of the line, then `M-w` to copy it and leave copy mode."
  - "Press `C-b o` to move to the right pane, type `echo `, press `C-b ]` to paste the line, then press Enter."
---

The pane on the left just printed 400 lines and an error is buried somewhere in the middle of them. Reading every line to find it is slow, so scroll the history and search it instead.

## Concept

A pane keeps the output that scrolled off the top of the screen in its scrollback, a history of past lines whose size is set by the `history-limit` option (Level 4). Copy mode, from Level 3, Task 1, is what lets you look at that history: it freezes the pane and turns the keyboard over to movement and selection keys.

`Up` and `Down` move the cursor one line at a time, but that is slow over hundreds of lines. `C-Up` and `C-Down` run `scroll-up` and `scroll-down`: they move the visible window into the history without moving the cursor's row on screen, so you scroll faster. `PageUp` and `PageDown` move a full screen at a time. The position indicator at the top right, which the wiki's Help keys section also mentions for view mode, shows how far up you are.

`C-r` runs `search-backward-incremental`: it opens a prompt, and as you type, tmux jumps the cursor to the nearest match above it, updating on every keystroke. Press Enter to stop at the match, or `C-g` to cancel and go back to where you started. There is a forward search too, but from the bottom of a pane's history everything you want is above the cursor, so backward is what you need here.

## Do this

1. Press `C-b [` on the left pane. It freezes and the position indicator appears at the top right, reading `0`.
2. Hold `C-Up` (or press `PageUp` a few times) until the indicator passes 50. The visible lines are now numbers from partway through `server.log`.
3. Press `C-r`, type `ERROR`, and watch the cursor jump to the line `ERROR request-id=req-51c2e9a7d4 failed`. Press `Enter` to stop there.
4. Press `C-a` to reach the start of that line, `C-Space` to start a selection, `C-e` to extend it to the end of the line, then `M-w` to copy it and leave copy mode.
5. Press `C-b o` to move to the right pane, type `echo ` (with a trailing space), then press `C-b ]` to paste the copied line, and press Enter.

**Done when** you scrolled at least 50 lines up, a paste buffer holds the `req-51c2e9a7d4` line, and it has been pasted into the shell in the right pane.

## What just happened

`C-Up` and `C-r` both run copy mode commands: `send-keys -X scroll-up` and `send-keys -X search-backward-incremental`. Scrolling moves the frozen view through the pane's scrollback; searching moves the cursor to text in that same history, without you having to read past it line by line.

Selecting and copying worked exactly as in Level 3, Task 1: `C-Space` marks the start, `C-e` extends it, `M-w` copies the selection into a new automatic buffer and exits copy mode. `C-b ]` then ran `paste-buffer`, which inserts the most recently created buffer's text into the active pane as if it had been typed there, which is why it landed after `echo `.

A common mistake is searching forward from the bottom of a pane: there is nothing below the cursor to find, so the search comes up empty. Always search backward when hunting through history you have already scrolled past.

## Go further

- `M-f` and `M-b` move the cursor forward and backward a word at a time in copy mode, useful for landing exactly on `req-51c2e9a7d4` without selecting the whole line.
- After a search, `n` repeats it in the same direction and `N` repeats it in the opposite direction, so you can step through several matches.
- `history-limit` (Level 4) sets how many lines of scrollback a pane keeps before the oldest are discarded.
