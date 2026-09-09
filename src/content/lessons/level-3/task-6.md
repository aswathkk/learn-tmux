---
title: "Use the mouse"
slug: "use-the-mouse"
summary: "Turn on mouse support and use clicks to change the active pane and the current window, and a drag to copy."
seoDescription: 'Turn on tmux mouse support with set -g mouse on, then click to change pane, click the status line to change window, and drag to copy text.'
level: 3
task: 6
difficulty: advanced
estimatedMinutes: 4
concepts: [mouse, options, set-option]
keys:
  - key: ":set -g mouse on"
    command: "set-option -g mouse on"
    description: "Enable mouse support for every session"
  - key: ":bind MouseDown1Pane"
    command: "select-pane (mouse key binding)"
    description: "Left click a pane to activate it; drag a border to resize; drag over text to copy"
  - key: ":bind MouseDown1Status"
    command: "select-window (mouse key binding)"
    description: "Click a window name in the status line to switch to it; right click opens a menu"
wikiSections: ["Using the mouse", "Changing options"]
challenge: false
objective: "Mouse on, right pane active, window `logs` current, and a drag has copied text."
setup:
  - "printf 'left pane\\nright pane\\n' > /home/alpine/notes.txt"
  - "tmux new-session -d -s learn -n shell -x 120 -y 36 \"sh -c 'cat ~/notes.txt; exec sh'\""
  - "tmux split-window -h -t learn:0 \"sh -c 'cat ~/notes.txt; exec sh'\""
  - "tmux select-pane -t learn:0.0"
  - "tmux new-window -d -n build -t learn"
  - "tmux new-window -d -n logs -t learn"
  - "tmux select-window -t learn:0"
startCommand: "tmux attach -t learn"
checks:
  - id: mouse-on
    description: "The mouse option is on"
    kind: tmux
    command: "show-options -gv mouse"
    expect: "^on$"
  - id: right-pane-active
    description: "The right pane of window 0 (index 1) is active"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^1$"
  - id: logs-window-current
    description: "Window logs (index 2) is the current window of session learn"
    kind: tmux
    command: "display-message -p -t learn '#{window_index}'"
    expect: "^2$"
  - id: buffer-from-drag
    description: "A drag copied text into an automatically named buffer"
    kind: tmux
    command: "list-buffers -F '#{buffer_name}'"
    expect: "^buffer"
hints:
  - "No mouse events reaching tmux? `C-b Right` for the pane, `C-b 2` for the window, and `C-b [` `C-Space` `M-w` for the buffer."
  - "Turn it on first: `C-b :` then `set -g mouse on`. Nothing visibly changes."
  - "Click the right pane; click `logs` in the status line; drag across a word and release."
---

## Concept

`set -g mouse on` at the prompt turns on mouse support. Then a click on a pane makes it active, a click on a window name in the status line switches to it, and dragging over text copies it into a buffer on release.

`mouse` is an option, a named setting on the server, a session or a window, changed with `set-option` (`set`). `-g` sets it globally for every session.

With it on, mouse events are key bindings like any other: a click runs `select-pane` or `select-window`, a border drag runs `resize-pane`, and a right click opens a menu with each command's key shown.

## Do this

1. Press `C-b :`, type `set -g mouse on`, Enter.
2. Click the right pane, the one showing `right pane`. Its border highlights.
3. Click `logs` in the status line. Window `logs` is current.
4. Drag across a word in the pane and release. The text is now in a buffer.

## What just happened

The click ran `select-pane` with that pane as target, the same command `C-b Right` runs. The status line click ran `select-window`. The drag selected in copy mode and the release copied, making an automatic buffer that `C-b ]` would paste.

## Go further

- `set -gu mouse` unsets the option, back to off.
- Hold Shift while dragging to let the terminal select text itself, for copying into another application.
