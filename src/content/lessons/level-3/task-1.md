---
title: "Copy text in copy mode"
slug: "copy-mode"
summary: "Enter copy mode, move the cursor with emacs-style keys, select a line and copy it into a paste buffer."
level: 3
task: 1
difficulty: advanced
estimatedMinutes: 4
concepts: [copy-mode, selection, paste-buffer, mode-keys]
keys:
  - key: "C-b ["
    command: "copy-mode"
    description: "Enter copy mode; arrows move, C-a and C-e go to line start and end, q exits"
  - key: "C-Space"
    command: "send-keys -X begin-selection"
    description: "Start a selection at the cursor (copy mode); C-g cancels it"
  - key: "M-w"
    command: "send-keys -X copy-selection-and-cancel (C-w does the same)"
    description: "Copy the selection into a new buffer and leave copy mode"
wikiSections: ["Copy and paste", "Help keys"]
challenge: false
objective: "Copy the deploy key line from the notes shown in the pane into a paste buffer."
setup:
  - "printf 'line one\\nline two\\ndeploy key: deploy-key-7f3a9c2e\\nline four\\n' > /home/alpine/notes.txt"
  - "tmux new-session -d -s learn -n notes -x 120 -y 36 \"sh -c 'cat ~/notes.txt; exec sh'\""
startCommand: "tmux attach -t learn"
checks:
  - id: copy-mode-entered
    description: "Window 0 of session learn is in copy mode"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_mode}'"
    expect: "^copy-mode$"
  - id: deploy-key-copied
    description: "A paste buffer contains the deploy key line"
    kind: tmux
    command: "list-buffers -F '#{buffer_sample}'"
    expect: "deploy-key-7f3a9c2e"
hints:
  - "Press `C-b [` to enter copy mode. The pane freezes and a position indicator appears in the top right."
  - "Move the cursor onto the deploy key line with `Up` and `Down`, then `C-a` to reach the start of the line."
  - "Press `C-Space` to start the selection, move to the end of the line with `C-e`, then press `M-w` to copy it."
  - "If `C-Space` does nothing in your terminal, press `C-b :` and run `send-keys -X begin-selection` instead, then `C-e` and `M-w` as before."
---

Scrolling back through a pane's output is one thing. Getting a line out of it and into your shell is another. tmux does this with copy mode and its own clipboard.

## Concept

Copy mode is a mode a pane can be in, alongside the view mode you used in Level 1, Task 3 and the tree mode of Level 2, Task 9. It freezes whatever the pane is showing and turns the keyboard over to a set of keys for moving around and selecting text, none of which need the prefix. View mode is in fact a read-only form of copy mode: the same freeze, the same movement keys, but no selecting or copying.

Copy mode uses emacs-style keys by default, the same style command mode uses. That is because the `VISUAL` and `EDITOR` environment variables are unset in this sandbox; tmux falls back to vi-style keys only when one of them names something containing `vi`. Level 4, Task 9 covers switching to vi keys on purpose.

A piece of copied text is called a paste buffer. Each buffer tmux creates on its own gets an automatic name like `buffer0` or `buffer1`; up to 50 automatic buffers are kept, and the oldest is dropped once a new one would exceed that. Named buffers, covered in Task 4, are never dropped this way.

## Do this

1. Read the notes shown in the pane. One line reads `deploy key: deploy-key-7f3a9c2e`.
2. Press `C-b [`. The pane freezes and a position indicator appears at the top right: you are now in copy mode.
3. Move the cursor onto the deploy key line with `Up` and `Down`, then press `C-a` to put the cursor at the start of the line.
4. Press `C-Space` to start a selection at the cursor.
5. Press `C-e` to extend the selection to the end of the line.
6. Press `M-w` to copy the selection into a new paste buffer. Copy mode ends and the pane unfreezes.

**Done when** the pane has been in copy mode and a paste buffer holds the deploy key line.

## What just happened

`C-b [` runs the `copy-mode` command, which puts the active pane into copy mode without touching anything else in the session. `C-Space` runs `send-keys -X begin-selection`, marking the cursor's current position as one end of a selection; `C-a` and `C-e` are the same start-of-line and end-of-line moves the command prompt uses. `M-w` runs `send-keys -X copy-selection-and-cancel`, which copies the marked text into a new automatic buffer and cancels copy mode in one step. `C-w` does exactly the same thing; this lesson leads with `M-w` because some browsers treat `C-w` as "close this tab" before tmux ever sees it.

The copy landed in a buffer named something like `buffer0`, since no name was given. Task 4 shows how to name a buffer with `set-buffer -n` so it survives longer than the automatic ones. If a selection goes wrong, `C-g` cancels it without copying and copy mode stays open, so you can start again.

## Go further

- `C-b ?` lists every default key binding with its description, including the ones copy mode uses, and `C-b /` shows the description for one key you press next.
- The manual page has the full copy mode key table for both emacs and vi styles, since only a handful are shown here.
- `q` exits copy mode without copying anything, the same key that exits view mode.
