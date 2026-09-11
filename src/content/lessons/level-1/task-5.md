---
title: "Detach and come back"
slug: "detach-and-reattach"
summary: "Start a log tail, detach from the session, and reattach to find it still running."
seoDescription: 'Detach from a tmux session with C-b d, leave a log tail running, and come back to it with tmux attach -t. Your work survives the terminal.'
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
    description: "Attach to a session by name; plain tmux attach picks the most recent unattached one"
wikiSections: ["Attaching and detaching", "The tmux server and clients"]
challenge: false
objective: "`tail` is still running in window 0 after you detach from `learn` and reattach."
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
  - "Detach with `C-b d`, not `exit`. `exit` ends the shell and takes the session with it."
  - "Start the log with `tail -f ~/build.log`, then press `C-b d`."
  - "Reattach with `tmux attach -t learn`."
---

## Concept

`C-b d` detaches: your terminal leaves the session, but the session and everything running in it stay alive on the server. `tmux attach -t learn` puts you back exactly where you were.

The difference that matters, and the one that costs people work:

- `exit`, or closing the terminal — ends the shell in the pane, and with it the window and the session
- `C-b d` — ends only the client, the link between your terminal and the server

Programs inside a detached session never notice they were left.

## Attaching without a name

`attach` without `-t` picks the most recently used session that has no client — fine with one session, a guess with several.

## Do this

1. Run `tail -f ~/build.log`.

   Forty lines scroll past, then it waits for more.

2. Press `C-b d`.

   tmux prints `[detached (from session learn)]` and you are back at the plain shell.

3. Run `tmux attach -t learn`.

   The status line returns and `tail` is still running.

## What just happened

`C-b d` runs `detach-client`. The server kept the session, its window and the `tail` process running with no client watching. `attach-session -t learn` connected your terminal to that session again; nothing inside it ever stopped.

## Go further

- `tmux attach` with no `-t` attaches to the most recently used unattached session.
- `tmux new -A -s learn` attaches if `learn` exists and creates it if not, so one command works either way.
