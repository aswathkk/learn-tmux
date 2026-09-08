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
objective: "Start a tmux session named learn and be attached to it with the green status line showing [learn] at the bottom."
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
  - "The command is `new-session`, or `new` for short. Run it from the shell prompt, not from inside tmux."
  - "The `-s` flag sets the session name. The name has to be exactly `learn`."
  - "If the status line shows `[0]`, type `exit` and press Enter to close that session, then run `tmux new -s learn -n shell`."
---

You are logged in to the build box and every long job dies the moment your connection drops. tmux fixes that, and the first step is to start a session.

## Concept

tmux keeps all its state in a single main process called the tmux server. It runs in the background and manages every program running inside tmux. It starts the first time you run a tmux command and by default exits when no programs are left running.

You talk to the server through a client. A client takes over the terminal where it runs and talks to the server through a socket file in `/tmp`.

The programs the server manages are grouped into sessions. A session has one or more windows, a window has one or more panes, and a pane is where a program such as a shell runs. This task uses one of each.

The command that creates a session is `new-session`, or `new` for short. With no arguments it creates a session called `0`, then `1`, and so on. The `-s` flag gives the session a name. The first window is named after whatever is running in it unless you pick a name with the `-n` flag.

While a client is attached, the bottom line of the screen is the green status line.

## Do this

1. At the shell prompt, run the command below. The screen clears, the shell prompt moves to the top and a green status line appears at the bottom.

   ```bash
   tmux new
   ```

2. Read the left end of the status line. It says `[0]`: tmux started the server, created a session called `0` and attached this terminal to it as a client.

3. Read the middle. It says `0:sh*`: one window at index 0, named `sh` after the program running in it, and the `*` marks the current window. On the right is the pane title in quotes, which defaults to the host name, then the time and the date.

4. Type `exit` and press Enter. The shell ends, so its window and session close. Nothing is left running, so the server exits too and you are back at the plain shell.

5. Create the session for this level, naming both the session and its first window.

   ```bash
   tmux new -s learn -n shell
   ```

6. Check the status line. The left end now reads `[learn]` and the window list reads `0:shell*`. Stay attached.

**Done when** a session named `learn` exists and your terminal is attached to it.

## What just happened

`tmux new` runs the `new-session` command. There was no server, so tmux started one, created the session and made the tmux you ran from the shell the first client. The session got one window at index 0 with a single pane running a shell, hence `sh` in the window list.

Typing `exit` ended that shell, and with nothing left to manage the server went away too. Level 1, Task 5 introduces `C-b d`, which leaves a session without closing anything in it.

The second command used two flags. `-s learn` set the session name, so the status line shows `[learn]`. `-n shell` named window 0, so the window list shows `0:shell` instead of `0:sh`. You will use `-n` again in Level 1, Task 6.

Two mistakes are common. Plain `tmux new` gives a session called `0`: type `exit` and run it again with `-s learn`. Running `tmux new` while already inside tmux is refused with an error (a duplicate session, or a warning that sessions should be nested with care). Run it at the plain shell.

## Go further

- A flag and its argument can be written together: `tmux new -slearn` is the same as `tmux new -s learn`.
- Extra arguments name a program to run instead of a shell: from a plain shell, `tmux new -s monitor -n top top` starts a session whose window runs `top`.
