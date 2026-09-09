---
title: "Kill the server"
slug: "kill-the-tmux-server"
summary: "Shut down every session at once with kill-server, and see why exiting the last shell does the same."
seoDescription: 'Shut down every tmux session at once with kill-server, and see why exiting the last shell in the last window does exactly the same thing.'
level: 1
task: 10
difficulty: beginner
estimatedMinutes: 3
concepts: [server, kill-server, exit]
keys:
  - key: ":kill-server"
    command: "kill-server"
    description: "Kill the tmux server and every session, window and pane in it"
wikiSections: ["Killing tmux entirely", "Listing sessions", "The command prompt"]
challenge: false
objective: "The tmux server is gone; `tmux ls` reports no server."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-window -d -t learn -n logs"
  - "tmux new-session -d -s scratch -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: server-down
    description: "The tmux server has been killed; tmux ls reports no server running"
    kind: shell
    command: "tmux ls >/dev/null 2>&1 && echo up || echo down"
    expect: "^down$"
hints:
  - "`kill-server` is a tmux command: type it at `C-b :`, not at the shell prompt. There is no confirmation."
  - "`tmux ls` works from inside a pane and lists every session, not just yours."
  - "`C-b :`, type `kill-server`, Enter."
---

## Concept

`kill-server`, typed at `C-b :`, stops the whole server at once: every session, window and pane, attached or not, with no confirmation. It is the one-step way to shut everything down.

Normally things close from the inside out. A program exits and its pane closes; the last pane in a window closes the window; the last window closes the session; the last session stops the server. `exit` in a shell starts that chain and nothing else.

`kill-server` skips the chain and does not care what is still running.

## Do this

1. Run `tmux ls`. Two sessions: `learn` with two windows and `scratch` with one.
2. Type `exit`. This pane's shell ends and window `shell` closes; `learn` still has `logs`, so you stay attached, now looking at it.
3. Press `C-b :`, type `kill-server`, Enter. You are back at the plain shell, and `tmux ls` reports no server.

## What just happened

`exit` never talked to tmux; the server saw the shell end and closed its pane and window. `kill-server` targets the server itself, so `scratch`, which had no client at all, went with it.

## Go further

- `kill-session -t learn` closes one session and leaves the rest running.
- `C-b d` leaves everything running; only an empty server, or `kill-server`, stops it.
