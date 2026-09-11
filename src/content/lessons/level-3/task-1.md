---
title: "Copy text in copy mode"
slug: "copy-mode"
summary: "Enter copy mode, move the cursor with emacs-style keys, select a line and copy it into a paste buffer."
seoDescription: 'Enter tmux copy mode with C-b [, move with the emacs keys, start a selection with C-Space and copy the line into a paste buffer with M-w.'
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
objective: "A paste buffer holds the `deploy key` line."
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
  - "If `C-Space` does nothing in your terminal, press `C-b :` and run `send-keys -X begin-selection` instead."
  - "`C-b [` enters copy mode. `Up` and `Down` move; `C-a` and `C-e` go to the start and end of the line."
  - "On the deploy key line: `C-a`, `C-Space`, `C-e`, then `M-w` to copy and leave."
---

## Concept

Copy mode is the read-and-select mode for a pane's screen and its scrollback. The pane freezes, and inside it no key needs a prefix:

- `C-b [` — enter copy mode
- arrows — move the cursor
- `C-a` / `C-e` — jump to the start or end of the line
- `C-Space` — start a selection (`C-g` drops it and stays)
- `M-w` — copy the selection into a buffer and leave
- `q` — leave without copying

The copied text becomes a paste buffer, ready for the next task.

## How automatic buffers are kept

Buffers copied this way are automatic — `buffer0`, `buffer1` and so on — and tmux keeps the last 50.

`C-w` copies exactly like `M-w`, but many browsers close the tab on `C-w` first, so `M-w` is the safer habit.

The keys above are emacs-style, the default. A vi-style table exists too, and the `mode-keys` option switches between them.

## Do this

1. Press `C-b [`.

   The pane freezes and a position counter appears top right.

2. Press `Up` until the cursor is on `deploy key: deploy-key-7f3a9c2e`, then `C-a`.

   The cursor sits at the start of that line.

3. Press `C-Space`, then `C-e`.

   The line highlights from start to end.

4. Press `M-w`.

   The highlight goes, copy mode ends, and the line is in a buffer.

## What just happened

`C-b [` runs `copy-mode`. Inside, keys send copy mode commands: `C-Space` is `begin-selection` and `M-w` is `copy-selection-and-cancel`, both via `send-keys -X`. The copy landed in an automatic buffer, ready to paste.

## Go further

- `C-b ?` lists copy mode's keys along with everything else; `man tmux` has the full table for both key styles.
- `q` leaves copy mode without copying.
