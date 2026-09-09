---
title: "Challenge: morning on the build box"
slug: "challenge-morning-on-the-build-box"
summary: "From a bare shell, build session work: an editor window, a build window with a full-width log pane, and a monitor window, then detach and come back."
seoDescription: 'A tmux challenge: from a bare shell, build a work session with editor, build and monitor windows and a full-width log pane, then detach.'
level: 1
task: 11
difficulty: beginner
estimatedMinutes: 10
concepts: [session, window, pane, split-window-flags, command-prompt, detach, attach]
keys: []
wikiSections: ["Creating sessions", "Creating new windows", "Splitting the window", "The command prompt", "Attaching and detaching", "Listing sessions"]
challenge: true
objective: "Session `work`: `editor`, `build` with a full-width `tail` pane, `monitor` on `top`; detached and back."
setup:
  - "for i in $(seq 1 40); do echo compiling module $i; done > /home/alpine/build.log"
checks:
  - id: "window0-named-editor"
    description: "Window 0 of session work is named editor"
    kind: tmux
    command: "display-message -p -t work:0 '#{window_name}'"
    expect: "^editor$"
  - id: "build-window-three-panes"
    description: "Window build in session work has three panes"
    kind: tmux
    command: "list-windows -t work -F '#{window_name}:#{window_panes}'"
    expect: "^build:3$"
  - id: "build-log-pane-full-bottom"
    description: "Window build has a full-width bottom pane running tail"
    kind: tmux
    command: "list-panes -t work:build -F '#{pane_at_bottom}:#{?#{==:#{pane_width},#{window_width}},full,part}:#{pane_current_command}'"
    expect: "^1:full:tail$"
  - id: "monitor-window-runs-top"
    description: "A non-current window named monitor runs top"
    kind: tmux
    command: "list-windows -t work -F '#{window_name}:#{window_active}:#{pane_current_command}'"
    expect: "^monitor:0:top$"
  - id: "detached-after-building"
    description: "No client is attached to session work right after detaching"
    kind: tmux
    command: "display-message -p -t work '#{session_attached}'"
    expect: "^0$"
  - id: "reattached-to-work"
    description: "A client is attached to session work again after reattaching"
    kind: tmux
    command: "display-message -p -t work '#{session_attached}'"
    expect: "^1$"
hints:
  - "Name windows as you create them: `-n` at creation is the only rename you know so far."
  - "`tmux new -s work -n editor` starts the session and names window 0 in one line."
  - "The log pane must span the full width below the others: `split-window -fv tail -f ~/build.log` from `C-b :`."
  - "Create `build` and `monitor` with `neww -n` at the prompt. Give `monitor` `-d` so it does not become current, and `top` as its program."
---

## Concept

Nothing new here. Session, windows and panes are built in order with the names given at creation; `-fv` makes a full-width bottom pane; `neww -d -n name program` makes a named, non-current window running a program; `C-b d` and `tmux attach` leave and return.

The end state is checked, not the route. Read the status line after each step: it shows the session name, every window with its index, and which one is current.

## Do this

Build session `work` so that:

1. Window 0 is named `editor`, created with the session from the plain shell.
2. A window `build` has two panes side by side and a full-width bottom pane running `tail -f ~/build.log`.
3. A window `monitor` runs `top` and is not current.
4. You have detached from `work` and reattached.

## What just happened

`tmux new -s work -n editor` created the session and named its first window. `neww -n build`, then a split and a second split with `-fv` and a command, built the log window. `neww -d -n monitor top` added the third without leaving `build`. `C-b d` and `tmux attach -t work` proved everything survives without a client.

## Go further

- `build.log` stops at 40 lines; a real build keeps appending, which is why `tail -f` beats `less` for watching one.
- Every window in this task needed the prompt: no key binding names a window or runs a program in a new one.
