---
title: "Break out, join and send keys"
slug: "break-join-and-send-keys"
summary: "Move a pane into its own window, pull a window back in as a pane, and type into a pane from the command prompt."
seoDescription: 'Break a tmux pane into its own window with C-b !, pull a window back in as a pane with join-pane, and type into any pane with send-keys.'
level: 3
task: 7
difficulty: advanced
estimatedMinutes: 4
concepts: [break-pane, join-pane, send-keys, targets]
keys:
  - key: "C-b !"
    command: "break-pane"
    description: "Move the active pane into a new window"
  - key: ":join-pane -s src"
    command: "join-pane -s"
    description: "Move a pane from another window into the current window as a new pane"
  - key: ":send-keys -t target keys"
    command: "send-keys -t"
    description: "Send keystrokes to a pane, for example a command followed by Enter"
wikiSections: ["Other features", "Splitting the window"]
challenge: false
objective: "`tail` alone in window 2, the `shell` pane joined into window 0, and `joined-ok` printed there."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux split-window -h -t learn:0 'tail -f /dev/null'"
  - "tmux new-window -d -t learn -n shell"
  - "tmux select-window -t learn:0"
  - "tmux select-pane -t learn:0.1"
startCommand: "tmux attach -t learn"
checks:
  - id: tail-in-own-window
    description: "The tail pane now lives alone in window 2"
    kind: tmux
    command: "list-windows -t learn -F '#{window_index}:#{pane_current_command}'"
    expect: "^2:tail$"
  - id: shell-joined-window-0
    description: "Window 1 is gone and window 0 has two panes"
    kind: tmux
    command: "list-windows -t learn -F '#{window_index}:#{window_panes}'"
    expect: "^0:2\\n2:1$"
  - id: echo-ran-in-joined-pane
    description: "send-keys ran echo joined-ok in the joined pane"
    kind: tmux
    command: "capture-pane -p -t learn:0.1"
    expect: "joined-ok"
hints:
  - "`join-pane -s shell` names the source; the destination is the window you run it from. Be in window 0."
  - "`C-b !` on the `tail` pane breaks it out. Then `C-b 0`, `C-b :`, `join-pane -s shell`."
  - "`send-keys -t learn:0.1 'echo joined-ok' Enter` types into pane 1 of window 0 from the prompt."
---

## Concept

`C-b !` breaks the active pane out into a window of its own. `join-pane -s window` at the prompt pulls a pane from another window into this one. `send-keys -t target text Enter` types into a pane you are not looking at.

A pane keeps its program and history when it moves. Joining the last pane out of a window closes that window, as killing it would.

`send-keys` sends each argument as keys: a quoted string is typed literally and a key name like `Enter` is pressed. Targets are `session:window.pane`.

## Do this

1. With the `tail` pane active, press `C-b !`. It becomes window 2; window 0 has one pane left.
2. Press `C-b 0`. Press `C-b :`, type `join-pane -s shell`, Enter. Window 0 has two panes and window 1 is gone.
3. Press `C-b :`, type `send-keys -t learn:0.1 'echo joined-ok' Enter`, Enter. `joined-ok` prints in the second pane.

## What just happened

`break-pane` gave the `tail` pane a new window at the next free index. `join-pane` moved `shell`'s only pane here, so the empty window closed. `send-keys` delivered the text and then the Enter key to pane 1, which ran it as if you had typed it.

## Go further

- `join-pane -h` or `-v` chooses how the incoming pane splits; `-t` picks a destination other than the current window.
- `break-pane -n name` names the new window.
- `capture-pane`, `pipe-pane`, `respawn-pane` and `display-menu` are the next scripting tools to read about in `man tmux`.
