---
title: "Kill a pane, a window and a session"
slug: "kill-pane-window-session"
summary: "Close things at each level of the model with x, & and kill-session."
level: 2
task: 3
difficulty: intermediate
estimatedMinutes: 4
concepts: [kill-pane, kill-window, kill-session, confirmation]
keys:
  - key: "C-b x"
    command: "kill-pane (confirm-before)"
    description: "Kill the active pane after a y/n prompt"
  - key: "C-b &"
    command: "kill-window (confirm-before)"
    description: "Kill the current window and all its panes after a y/n prompt"
  - key: ":kill-session -t name"
    command: "kill-session -t"
    description: "Kill a session and all its windows; without -t kills the attached session"
wikiSections: ["Killing a session, window or pane", "The command prompt"]
challenge: false
objective: "`learn` has two panes in `editor`, no `scratch` window, and session `old` is gone."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux split-window -h -t learn:0"
  - "tmux split-window -v -t learn:0 'yes > /dev/null'"
  - "tmux new-window -d -t learn -n scratch"
  - "tmux new-window -d -t learn -n logs 'tail -f /dev/null'"
  - "tmux new-session -d -s old -x 120 -y 36"
  - "tmux select-window -t learn:0"
startCommand: "tmux attach -t learn"
checks:
  - id: two-panes
    description: "Window 0 of session learn (editor) has exactly two panes"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_panes}'"
    expect: "^2$"
  - id: scratch-window-killed
    description: "Session learn keeps only the windows editor and logs, in that order"
    kind: tmux
    command: "list-windows -t learn -F '#{window_name}'"
    expect: "^editor\\nlogs$"
  - id: session-old-killed
    description: "Only the session learn remains on the server"
    kind: shell
    command: "tmux ls -F '#{session_name}' | tr '\\n' ','"
    expect: "^learn,$"
hints:
  - "`C-b &` kills the current window, whichever it is. Switch to `scratch` first."
  - "Every create has a kill: `C-b x` undoes a split, `C-b &` undoes a window. Both ask `y/n`."
  - "`kill-session` has no key. Open `C-b :` and type `kill-session -t old`."
  - "`C-b x` `y`, then `C-b n` `C-b &` `y`, then `C-b :` `kill-session -t old`."
---

## Concept

Every create has a kill. `C-b x` kills the active pane, `C-b &` the current window, and `kill-session -t name` at the prompt a whole session, from anywhere. The first two ask `y/n` before acting.

Killing is not exiting. `exit` ends a program on its own terms and the pane closes because it is empty; a kill forces the pane, window or session closed whatever is running, which matters for a program like `yes` that never ends.

Killing the last pane closes its window; killing the last window closes its session. `kill-session` without `-t` kills the session you are attached to and detaches you.

## Do this

1. Press `C-b x`, then `y`. The pane running `yes` closes; two panes remain.
2. Press `C-b n` to reach `scratch`, then `C-b &`, then `y`. The list reads `editor logs`.
3. Press `C-b :`, type `kill-session -t old`, Enter. Nothing on screen changes; `old` is gone.

## What just happened

`C-b x` and `C-b &` run `confirm-before` around `kill-pane` and `kill-window`, which is where the prompt comes from. `kill-session` has no key because keys only reach the session you are attached to; the prompt can name any session on the server.

## Go further

- `kill-pane -a` and `kill-window -a` keep the target and kill every other one at that level.
- `kill-session -a -t learn` keeps `learn` and kills everything else.
- `confirm-before -p 'sure?' -y kill-window` changes the prompt and makes Enter mean yes.
