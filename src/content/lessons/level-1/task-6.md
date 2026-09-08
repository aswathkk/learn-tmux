---
title: "Read the session list and juggle sessions"
slug: "list-and-switch-sessions"
summary: "List sessions from the shell, pick the right one by its window count, run a program in a new session, and reattach safely with new -A."
level: 1
task: 6
difficulty: beginner
estimatedMinutes: 5
concepts: [session, list-sessions, attach-or-create, server, nesting]
keys:
  - key: "tmux ls"
    command: "list-sessions (ls)"
    description: "List sessions with their window counts and whether they are attached"
  - key: "tmux new -s name -n name command"
    command: "new-session [shell-command]"
    description: "Run a program in the first window instead of a shell (one argument goes through the shell)"
  - key: "tmux new -A -s name"
    command: "new-session -A -s"
    description: "Attach to the named session if it exists, otherwise create it"
wikiSections: ["Listing sessions", "Creating sessions", "Attaching and detaching", "Sessions, windows and panes"]
challenge: false
objective: "Back on the three-window session, `watch` running `top` detached, four sessions in total."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-session -d -s build -n compile -x 120 -y 36"
  - "tmux new-window -d -t build -n test"
  - "tmux new-window -d -t build -n docs"
  - "tmux new-session -d -s notes -n todo -x 120 -y 36"
  - "tmux new-window -d -t notes -n list"
checks:
  - id: attached-to-three-window-session
    description: "The learner's client is attached to the session with three windows"
    kind: tmux
    command: "list-clients -F '#{client_session}'"
    expect: "^build$"
  - id: watch-runs-top
    description: "Session watch has a window named stats running top"
    kind: tmux
    command: "display-message -p -t watch:0 '#{window_name}:#{pane_current_command}'"
    expect: "^stats:top$"
  - id: watch-detached
    description: "Session watch is detached"
    kind: tmux
    command: "display-message -p -t watch '#{session_attached}'"
    expect: "^0$"
  - id: back-on-build
    description: "The learner's client is attached to build again, via new -A"
    kind: tmux
    command: "list-clients -F '#{client_session}'"
    expect: "^build$"
  - id: four-sessions-total
    description: "The server has exactly four sessions: no duplicate was created"
    kind: shell
    command: "tmux ls -F '#{session_name}' | wc -l | tr -d ' '"
    expect: "^4$"
hints:
  - "Do not press `q` inside `top`. That ends the program and closes the `watch` session with it; detach with `C-b d` instead."
  - "`tmux ls` prints one line per session with its window count. Attach to the one that says `3 windows` with `tmux attach -t name`."
  - "Create the watcher with `tmux new -s watch -n stats top`, detach, then return with `tmux new -A -s name`."
---

## Concept

`tmux ls` lists every session on the server with its window count, from the shell, without attaching. `tmux new -A -s name` attaches to `name` if it exists and creates it if not, so it never makes a duplicate.

Sessions are independent: each has its own name, window list and current window. Names must be unique on a server, which is why plain `new -s name` fails when `name` already exists.

A word after `new`'s flags is a program to run in the first window instead of a shell. One word goes through the shell, so `~` and pipes work.

## Do this

1. Run `tmux ls`. Three sessions are listed; note the one with `3 windows`.
2. Run `tmux attach -t` and that name. You are on it. Press `C-b d` to detach.
3. Run `tmux new -s watch -n stats top`. A session opens with `top` in a window named `stats`. Press `C-b d`.
4. Run `tmux new -A -s` and the three-window session's name. You are back on it, and the server still has four sessions.

## What just happened

`list-sessions` reads the server's list, so it works from any shell. `new-session` with a program argument ran `top` where a shell would have been, and `-A` turned a would-be duplicate into an attach. Detaching left `top` running; only `q` inside it, or a kill, would end it.

## Go further

- `new -D` is `-A` plus detaching any other client on that session.
- `tmux ls -F '#{session_name}'` prints just the names, handy in scripts.
