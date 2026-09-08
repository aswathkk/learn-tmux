---
title: "Use the mouse"
slug: "use-the-mouse"
summary: "Turn on mouse support and use clicks to change the active pane and the current window, and a drag to copy."
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
    description: "Left click a pane to make it active; drag a border to resize; drag inside a pane to copy on release"
  - key: ":bind MouseDown1Status"
    command: "select-window (mouse key binding)"
    description: "Left click a window name in the status line to make it current; right click opens the pane, window or session menu"
wikiSections: ["Using the mouse", "Changing options"]
challenge: false
objective: "Enable the mouse, click the right pane of window 0 to activate it, click window 2 in the status line, then drag over some text so a buffer appears."
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
  - "The mouse is off by default. Turn it on with the command prompt: `C-b :`, then type `set -g mouse on` and press Enter."
  - "With the mouse on, left click the right pane to activate it, left click `logs` in the status line to switch windows, then left click and drag over a word in a pane and release."
  - "No mouse forwarded? Use `C-b Right` for the pane, `C-b 2` for the window, and in copy mode (`C-b [`) select with `C-Space` then copy with `M-w` to fill a buffer."
  - "Check the option with `:show-options -gv mouse`, it must read `on`, not `off`."
---

Reaching for arrow keys to switch panes works, but a terminal with mouse support built in should just let you click. tmux can hand off clicks and drags to the programs running inside it, or use them itself to move focus and copy text.

## Concept

Mouse support is off by default and turned on with the `mouse` option. An option is a named setting the server, a session or a window holds; you change one with the `set-option` command, or `set` for short. `set -g` sets a global session option, which applies to every session unless something overrides it. Level 4 covers the different kinds of option in more detail.

Once `mouse` is on, tmux binds several mouse events to commands, the same way it binds keys. A left click on a pane runs `select-pane` and makes that pane active. A left click on a window name in the status line runs `select-window` and makes that window current. Dragging on a pane border resizes the pane, and dragging inside a pane selects text; releasing the button copies the selection into a buffer, the same kind of buffer copy mode fills from Level 3, Task 1. A right click on a pane, window or session name opens a menu of commands, each with its key shortcut shown in brackets.

## Do this

1. Press `C-b :` to open the command prompt. Type `set -g mouse on` and press Enter. Nothing visibly changes yet.

2. Left click the right pane of window 0, the one showing `right pane`. Its border highlights: that pane is now active.

3. Left click `logs` in the status line. Window `logs` becomes current and its shell replaces the split view.

4. Left click and hold on a word in the pane, drag across it, then release the button. The text is copied into a new buffer.

**Done when** the mouse is on, the right pane of window 0 is active, window `logs` is current, and a drag has copied text into a buffer.

## What just happened

`set -g mouse on` sets the global `mouse` option, and tmux starts listening for mouse events from the terminal. Clicking the right pane ran `select-pane` with that pane as the target, the same command `C-b Right` runs from Level 1, Task 9, just chosen by position instead of direction. Clicking `logs` on the status line ran `select-window` targeting that window, in place of `C-b n` or a number key.

The drag matters for the model too: dragging inside a pane selects text, and releasing the button copies it, so the pane border you release over decides which pane's scrollback gets read. The buffer this creates has an automatic name like `buffer0`, exactly as copying in copy mode does; `C-b ]` pastes it and `C-b =` lists it, both from Level 3, Task 2 and Task 3.

## Go further

- `set -gu mouse` unsets the option and restores its default, off.
- Holding `Shift` while dragging tells the terminal to do its own selection instead of sending the drag to tmux, useful for copying text into another application.
