---
title: "Challenge: morning on the build box"
slug: "challenge-morning-on-the-build-box"
summary: "From a bare shell, build session work: an editor window, a build window with a full-width log pane, and a monitor window, then detach and come back."
level: 1
task: 11
difficulty: beginner
estimatedMinutes: 10
concepts: [session, window, pane, split-window-flags, command-prompt, detach, attach]
keys: []
wikiSections: ["Creating sessions", "Creating new windows", "Splitting the window", "The command prompt", "Attaching and detaching", "Listing sessions"]
challenge: true
objective: "Build session work: window 0 editor, a build window with three panes and a full-width bottom pane running tail -f ~/build.log, and a monitor window running top, not current; then detach and reattach."
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
  - "Name windows the moment you create them: this level has not covered renaming, so `-n` at creation is the only chance you get."
  - "`tmux new -s work -n editor` starts the session and names window 0 in one line, the same shape as Level 1, Task 1."
  - "The log pane must sit below the others and span the full width. `split-window -f -v` (Level 1, Task 8) does exactly that; give it `tail -f ~/build.log` as its command."
  - "Create `build` and `monitor` with `new-window -n` from the command prompt, add `-d` to `monitor` so it starts without becoming current, and give it `top` as its command directly, as in Level 1, Task 4."
---

It is five minutes before standup and the build is still running. You need to walk away from the desk without killing it, and find your way back after. Nothing here is new; the only new part is doing it all yourself, in order, from a bare shell.

## Concept

A session, its windows and their panes are built once, in the order you create them. This level has never covered renaming a window or a session, so the name you give `new-session` or `new-window` at the moment of creation is the one that sticks for the rest of this task.

`split-window` takes the same two flags either way: `-h` or `-v` for the direction, plus `-f` when a pane should span the full width or height of the window instead of just the space of the pane it split. A full-width pane along the bottom of a window, stacked below whatever panes already sit side by side, is the `-f -v` combination from Level 1, Task 8.

`new-window` takes a name with `-n`, skips becoming the current window with `-d`, and can run a program instead of a shell if you give it one as an argument, as covered in Level 1, Task 4. All three can be given together on one line.

None of this needs an attached terminal to keep running once you leave. Detaching with `C-b d` only removes your client; the session, its windows, and every program inside them, including a log still being read by `tail`, stay exactly as they were until you `attach` again.

## Do this

Build session `work` so it matches this, then detach and come back:

1. Session `work`, window 0 named `editor`, created together from the plain shell.
2. A second window named `build` with three panes: two side by side, and a third along the full-width bottom running `tail -f ~/build.log`.
3. A third window named `monitor` running `top`, created without switching to it.
4. Detach from `work` without stopping anything inside it, then find it again in the session list and reattach.

**Done when** window 0 is `editor`; `build` has three panes with a full-width bottom pane running `tail`; `monitor` runs `top` and is not the current window; and you have detached from `work` and reattached.

## What just happened

`tmux new -s work -n editor` created the session and named its first window in one step, the same shape as Level 1, Task 1. `new-window -n build` added the second window, and inside it `split-window -h` then `split-window -f -v` cut two ordinary panes and one full-width one, the last running `tail` against the log Task setup already wrote to `~/build.log`. `new-window -d -n monitor top` added the third window without disturbing which one was current, and ran `top` in it directly instead of a shell.

`C-b d` detached the client; `tmux ls` from the shell showed `work` still listed with all three windows; `tmux attach -t work` reattached to the same session, same panes, same running programs, exactly as Level 1, Task 5 first showed.

## Go further

- `build.log` stops growing after its 40 lines. A real build server keeps appending to a log like this for as long as the job runs, which is the whole point of watching it with `tail -f` instead of `less`.
- The command prompt (`C-b :`) can create every window in this task; there is no key binding for naming a window or running a program in a new one.
