---
title: "Detach and come back"
slug: "detach-and-reattach"
summary: "Start a log tail, detach from the session, and reattach to find it still running."
level: 1
task: 5
difficulty: beginner
estimatedMinutes: 4
concepts: [detach, attach, client, background-programs]
keys:
  - key: "C-b d"
    command: "detach-client"
    description: "Detach this client and return to the outside shell"
  - key: "tmux attach -t name"
    command: "attach-session -t (attach)"
    description: "Attach the terminal to an existing session by name (plain tmux attach picks the most recently used unattached session)"
wikiSections: ["Attaching and detaching", "The tmux server and clients"]
challenge: false
objective: "Run tail -f ~/build.log in window 0, detach from learn, then reattach and find tail still running."
setup:
  - "for i in $(seq 1 40); do echo compiling module $i; done > /home/alpine/build.log"
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: tail-running-before-detach
    description: "tail is running in window 0 of session learn before detaching"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_current_command}'"
    expect: "^tail$"
  - id: detached
    description: "No client is attached to session learn"
    kind: tmux
    command: "display-message -p -t learn '#{session_attached}'"
    expect: "^0$"
  - id: reattached
    description: "A client is attached to session learn again"
    kind: tmux
    command: "display-message -p -t learn '#{session_attached}'"
    expect: "^1$"
  - id: tail-survived
    description: "tail is still running in window 0 of session learn after reattaching"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_current_command}'"
    expect: "^tail$"
hints:
  - "Start the log with `tail -f ~/build.log`, then press `C-b d` to detach."
  - "Detaching returns you to the plain shell. It does not stop anything running inside the session."
  - "Reattach with `tmux attach -t learn`, the session name you created in Level 1, Task 1."
---

You are watching a build with `tail -f` when it is time to step away. Closing the terminal would kill the shell and the log with it. Detaching does not: it leaves the session, its window and everything running inside it in the background, so you can come back to it later.

## Concept

Closing a terminal, or typing `exit` at the shell, ends the shell running in that pane. That closes the window and, since it is the only one, the session with it. Detaching is different. It ends only the client, the connection between your terminal and the tmux server. The session, its window and every program inside it keep running on the server whether a client is watching or not.

The key binding for this is `C-b d`, which runs `detach-client`. tmux prints a message naming the session you left, `[detached (from session learn)]`, so you know where it went.

To come back, you attach again. `attach-session`, or `attach` for short, takes a session name with `-t`, so `tmux attach -t learn` finds the session called `learn` you created in Level 1, Task 1. Without `-t`, plain `tmux attach` picks whichever session was most recently used and has no client on it already, which stops being reliable once more than one session exists.

## Do this

1. Inside session `learn`, start watching the build log.

   ```bash
   tail -f ~/build.log
   ```

   The 40 lines scroll past, then the pane sits waiting for more to be appended.

2. Detach without stopping anything.

   Press `C-b d`.

   tmux prints `[detached (from session learn)]` and you land back at the plain shell you started from.

3. Reattach to the same session.

   ```bash
   tmux attach -t learn
   ```

   The status line reappears, and window 0 shows `tail` still running, exactly where you left it.

**Done when** `tail` is running in window 0, session `learn` then shows no attached client, then shows one again, and `tail` is still its running program.

## What just happened

`C-b d` runs `detach-client`. It ends only the client attached to this terminal; the server keeps the session, its window and the `tail` process running exactly as they were. That is different from typing `exit` in the pane: `exit` ends the shell itself, which closes the window and, since this session has only one window, the session along with it.

`tmux attach -t learn` runs `attach-session -t learn`. Naming the session makes tmux reattach to that one specifically, instead of guessing at the most recently used session. The window and pane come back exactly as they were, `tail` included, because nothing inside the session ever stopped running.

## Go further

- Plain `tmux attach`, with no `-t`, attaches to the most recently used session that has no client on it already.
- Level 1, Task 6 covers `new -A`, which attaches to a session if it exists or creates one if it does not, and `new -D`, which also detaches any other client already on it. Level 2, Task 11 uses both again.
