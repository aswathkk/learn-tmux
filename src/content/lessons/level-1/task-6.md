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
objective: "Attach to the three-window session, detach, create session watch running top in window stats, detach, then reattach to the three-window session with new -A. End with four sessions total."
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
  - "Run `tmux ls` first. It prints one line per session with its window count. Find the line that says `3 windows`."
  - "Attach with `tmux attach -t` and that session's name, then `C-b d` to detach."
  - "Create the watch session with `tmux new -s watch -n stats top`, then `C-b d`. Do not press `q` in top, or its pane and the session close."
  - "To get back, run `tmux new -A -s` and the three-window session's name. `-A` attaches if the session exists instead of failing or making a duplicate."
---

Three sessions are already running on this build box and you only know one thing about the one you want: it has three windows. `tmux ls` reads that straight from the server without attaching to anything.

## Concept

`list-sessions`, or `ls` for short, asks the server for every session and prints one line each: the name, the window count and when it was created. It is the fastest way to see what a server is doing before you commit to attaching.

Sessions are otherwise independent. Each has its own window list, its own current window and its own name, and session names must be unique on a server. Attaching to one session tells you nothing about the others; `tmux ls` is how you decide which one to attach to before you commit.

`new-session` can also start a program other than a shell. Extra arguments after the flags name the program. One argument is passed through the shell, so it can use shell features like `~`; more than one argument runs the command directly, with the program name first. `-n` still names the window, exactly as in Level 1, Task 1.

Reattaching by hand risks two mistakes: running `new` when the session already exists fails, or (from inside another session) prints a warning about nesting. `new-session -A` fixes both: it attaches to the named session if it exists, and only creates it if it does not. This is the safe form to put in a script or an SSH alias.

## Do this

1. At the shell prompt, run `tmux ls`. Three lines appear, each showing a session name and its window count.
2. Find the line reporting three windows and read its session name.
3. Attach to it: `tmux attach -t` followed by that name and Enter.
4. Detach with `C-b d`. You are back at the shell.
5. Create a new session with a program in its window: `tmux new -s watch -n stats top`. The window is named `stats` and runs `top` instead of a shell.
6. Detach again with `C-b d`. `top` keeps running in the background. Do not press `q` inside `top`; that would end the program, the pane, the window and the session together.
7. Reattach to the three-window session using the attach-or-create form: `tmux new -A -s` followed by its name and Enter.

**Done when** your terminal is attached to the three-window session, `watch` exists detached with `top` still running in its `stats` window, and the server holds four sessions in total.

## What just happened

`tmux ls` runs `list-sessions`. Each line comes straight from the server's list of sessions, independent of any client, which is why you can read it before attaching to anything.

`tmux new -s watch -n stats top` ran `new-session` with a program argument. `-n stats` named the window; `top` replaced the shell that would otherwise have started in it. Detaching with `C-b d` left the session and `top` running, exactly as in Level 1, Task 5.

The final command, `tmux new -A -s` and a name, ran `new-session -A`. Because that session already existed, `-A` attached to it instead of creating a duplicate or refusing. This is why the server still has four sessions afterward, not five: `learn`, `notes`, the three-window session and `watch`.

## Go further

- `new-session -D` behaves like `-A` but also detaches any other client already attached to that session, useful when only one person should be on a session at a time.
- `attach-session` (`tmux attach`) with no `-t` picks the most recently used session that is not already attached.
- `tmux lsk -N | more`, from Level 1, Task 3, works the same way `tmux ls` does: reading the server's state from the shell without attaching.
