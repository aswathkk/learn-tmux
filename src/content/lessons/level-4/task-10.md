---
title: "Mouse copying behaviour"
slug: "mouse-copying"
summary: "Change what happens when a mouse drag ends so the selection stays visible after it is copied."
seoDescription: 'Rebind MouseDragEnd1Pane in tmux to copy-selection-no-clear so a mouse drag copies the text without the selection vanishing under you.'
level: 4
task: 10
difficulty: expert
estimatedMinutes: 4
concepts: [mouse, copy-mode, key-bindings, MouseDragEnd1Pane]
keys:
  - key: ":bind -Tcopy-mode MouseDragEnd1Pane send -X copy-selection-no-clear"
    command: "bind-key -T copy-mode MouseDragEnd1Pane"
    description: "Copy on release but keep the selection highlighted and stay in copy mode"
  - key: ":unbind -Tcopy-mode MouseDragEnd1Pane"
    command: "unbind-key -T copy-mode MouseDragEnd1Pane"
    description: "Do nothing on release; copy with the keyboard instead"
wikiSections: ["Mouse copying behaviour", "Using the mouse", "Copy mode key bindings"]
challenge: false
objective: "Mouse on, `MouseDragEnd1Pane` copies without clearing, and the token line is in a buffer."
setup:
  - "echo 'token: mouse-copy-4d9e2b' > /home/alpine/notes.txt"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
  - "tmux new-session -d -s learn -n notes -x 120 -y 36 \"sh -c 'cat ~/notes.txt; exec sh'\""
startCommand: "tmux attach -t learn"
checks:
  - id: mouse-on
    description: "The mouse option is on"
    kind: tmux
    command: "show-options -gv mouse"
    expect: "^on$"
  - id: dragend-rebound
    description: "MouseDragEnd1Pane in the copy-mode table runs copy-selection-no-clear"
    kind: tmux
    command: "list-keys -T copy-mode MouseDragEnd1Pane"
    expect: "copy-selection-no-clear"
  - id: token-copied
    description: "A buffer holds the token line, from a mouse drag or a keyboard copy"
    kind: tmux
    command: "list-buffers -F '#{buffer_sample}'"
    expect: "mouse-copy-4d9e2b"
hints:
  - "Turn the mouse on first with `:set -g mouse on`; without it a drag selects in your terminal, not in tmux."
  - "The binding is in the `copy-mode` table: `:bind -T copy-mode MouseDragEnd1Pane send -X copy-selection-no-clear`."
  - "Then drag across the `token:` line and release. No mouse events? `C-b [`, `C-Space`, `C-e`, `M-w` fills the buffer just as well."
---

## Concept

A mouse drag ends with `MouseDragEnd1Pane`, a key like any other, bound in the `copy-mode` table to `copy-pipe-and-cancel`: copy, then leave copy mode. Rebind it to `copy-selection-no-clear` and a drag copies but keeps the selection and copy mode.

Mouse events are bindings, so `bind`, `unbind` and `list-keys` work on them. The `copy-mode` table is the one that matters here because the drag has already put the pane in copy mode, and this server uses emacs keys.

Unbinding the event instead makes a drag only highlight; copying then needs the keyboard.

## Do this

1. Press `C-b :`, type `set -g mouse on`, Enter.
2. Press `C-b :`, type `list-keys -T copy-mode MouseDragEnd1Pane`, Enter. It shows `copy-pipe-and-cancel`.
3. Press `C-b :`, type `bind -T copy-mode MouseDragEnd1Pane send -X copy-selection-no-clear`, Enter.
4. Drag across the `token:` line and release. The line stays highlighted, the pane stays in copy mode, and a buffer holds it.

## What just happened

`bind -T copy-mode` wrote into the copy mode table with a mouse event as the key. The new command is a copy mode command sent with `-X`, like every other; it does the copy but skips the `-cancel` step the default performs.

## Go further

- `copy-selection` copies and clears the highlight but stays in copy mode: a middle ground.
- `MouseDown1Pane`, `MouseDrag1Pane` and the status line and border events are listed under "Mouse key bindings" in `man tmux`.
- Put the working binding in `~/.tmux.conf` so it survives a restart.
