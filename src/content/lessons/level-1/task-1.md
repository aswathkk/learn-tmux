---
title: "Start your first session"
slug: "start-your-first-session"
summary: "Run tmux from the shell to start the server, create a named session and see the status line."
level: 1
task: 1
difficulty: beginner
estimatedMinutes: 3
concepts: [server, client, session, status-line]
keys:
  - key: "tmux new"
    command: "new-session (new)"
    description: "Start the server if needed, create a session called 0 and attach to it"
  - key: "tmux new -s name"
    command: "new-session -s"
    description: "Create a session with a name and attach to it"
  - key: "tmux new -n name"
    command: "new-session -n"
    description: "Name the first window instead of naming it after its program"
wikiSections: ["Basic concepts", "The tmux server and clients", "Using tmux interactively", "Creating sessions", "The status line"]
challenge: false
objective: "Be attached to a session named `learn`, with `[learn]` on the green status line."
setup: []
checks:
  - id: session-learn-exists
    description: "A session named learn exists on the tmux server"
    kind: tmux
    command: "display-message -p -t learn '#{session_name}'"
    expect: "^learn$"
  - id: session-learn-attached
    description: "One client (the learner's terminal) is attached to session learn"
    kind: tmux
    command: "display-message -p -t learn '#{session_attached}'"
    expect: "^1$"
hints:
  - "Run it at the plain shell prompt, not inside tmux. If the status line already shows `[0]`, type `exit` first."
  - "`tmux new -s learn` names the session; `-n shell` names its first window."
  - "The full command is `tmux new -s learn -n shell`."
---

## Concept

`tmux new -s name` starts tmux and drops you into a session called `name`. The green bar at the bottom is the status line: `[learn]` on the left is the session, `0:shell*` next to it is its one window.

tmux runs as a server in the background, and your terminal talks to it through a client. The server holds sessions; a session holds windows; a window holds panes; a pane runs a program, usually a shell. The server starts on your first tmux command and exits when nothing is left running in it.

Without `-s` the session is called `0`, then `1`, and so on. Without `-n` the first window is named after the program running in it, `sh` here.

## Do this

1. Run `tmux new`. The screen clears and a green status line appears, reading `[0] 0:sh*`: session `0`, one window named after the shell.
2. Type `exit`. The shell ends, the session with it, and you are back at the plain prompt.
3. Run `tmux new -s learn -n shell`. The status line now reads `[learn] 0:shell*`. Stay attached.

## What just happened

`tmux new` runs `new-session`. There was no server, so tmux started one, made a session with one window and one pane, and attached your terminal to it. `exit` ended the shell, then the pane, the window and the session, and the server quit because nothing was left in it. `-s` and `-n` only changed the names.

## Go further

- Extra arguments run a program instead of a shell: `tmux new -s monitor -n top top`.
- A flag and its value can be joined: `-slearn` is the same as `-s learn`.
- Running `tmux new` while already inside tmux is refused. Leaving a session running is detaching, not exiting.
