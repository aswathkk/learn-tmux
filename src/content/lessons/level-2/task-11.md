---
title: "Kick out a stale client"
slug: "detach-another-client"
summary: "See two other clients attached to a session, detach one from client mode, then take the session over with attach -d."
level: 2
task: 11
difficulty: intermediate
estimatedMinutes: 4
concepts: [client, client-mode, detach-client, attach-d]
keys:
  - key: "C-b D"
    command: "choose-client"
    description: "Client mode: Enter or d detaches the selected client, D detaches tagged clients; movement and tag keys as in tree mode"
  - key: "tmux attach -d -t name"
    command: "attach-session -d"
    description: "Attach and detach every other client from that session"
  - key: ":detach-client -a"
    command: "detach-client -a"
    description: "Detach all clients except the one running the command"
wikiSections: ["Detaching other clients", "Attaching and detaching", "The tmux server and clients"]
challenge: false
objective: "Detach one of the two stray clients on session home with C-b D, then leave learn and attach to home with -d so you are its only client."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-session -d -s home -n remote -x 120 -y 36"
  - "tmux new-window -d -t learn -n laptop 'TMUX= tmux attach -t home'"
  - "tmux new-window -d -t learn -n office 'TMUX= tmux attach -t home'"
startCommand: "tmux attach -t learn"
checks:
  - id: home-one-client
    description: "Only one client remains attached to session home"
    kind: tmux
    command: "display-message -p -t home '#{session_attached}'"
    expect: "^1$"
  - id: learn-empty
    description: "The learner's client has left session learn"
    kind: tmux
    command: "display-message -p -t learn '#{session_attached}'"
    expect: "^0$"
  - id: only-home-client
    description: "The one remaining client is on home"
    kind: shell
    command: "tmux list-clients -F '#{client_session}' | tr '\\n' ','"
    expect: "^home,$"
hints:
  - "Press `C-b D` to open client mode. It lists every client attached to the server, not just your own."
  - "Move to one of the clients attached to `home` and press `Enter` (or `d`) to detach it."
  - "After detaching one stray, run `tmux attach -d -t home` from the shell prompt of the other window in `learn`. The `-d` flag detaches the remaining stray and your own client on `learn`, and attaches you to `home`."
  - "You still need a shell to type that command from: switch to window 0 of `learn` with `C-b 0` first."
---

A colleague left a terminal attached to session `home` from the office, and now a second one is attached from a laptop too. Both are showing the session at a tiny size, and you want it full screen on your own terminal.

## Concept

A client is a terminal attached to the tmux server. A session can be attached to more than one client at once, and every client attached to a session sees the same windows and panes, resized to fit whichever client's terminal is smallest. Two stray clients on `home` are exactly why the session looks cramped.

`C-b D` opens client mode, a list of every client the server knows about: its terminal, the session it is attached to, its size, and when it was last used. Movement and tagging work as in tree mode from Level 2, Task 9. In client mode, `Enter` or `d` detaches the client under the cursor, and `D` detaches every tagged client.

Client mode only reaches clients one at a time, or a batch you tag first. When you want to become the sole client on a session in one move, `attach-session` has a `-d` flag: it detaches every other client from the target session before attaching you. The `detach-client` command has the same idea from the command prompt, with an `-a` flag that detaches every client except the one running the command.

## Do this

1. You are attached to `learn`, which has two windows, `laptop` and `office`, each running a nested tmux attached to `home`. Press `C-b D`. Client mode opens, listing three clients: yours on `learn`, and two on `home`.
2. Move to one of the two clients attached to `home`, then press `Enter`. That client detaches, its nested tmux exits, and the window it ran in closes. Client mode now shows two clients left.
3. Press `q` to leave client mode if it is still open.
4. Switch to window 0 of `learn` (`C-b 0`) to get a shell prompt.
5. Run the command below. This attaches you to `home`, detaching the one stray client still on it and detaching your own client from `learn` in the same move.

   ```bash
   tmux attach -d -t home
   ```

6. The screen switches to `home`. You are now its only client.

**Done when** one stray client on `home` is gone, your terminal has left `learn`, and `home` has exactly one client: you.

## What just happened

`C-b D` runs `choose-client`, which lists every client on the server the same way `choose-tree` lists sessions and windows. Detaching a client from the list is exactly what `C-b d` does to your own client: the client exits and its terminal returns to the plain shell, but everything inside the session keeps running.

`tmux attach -d -t home` runs `attach-session` with `-t home` and `-d`. The `-d` flag detaches every other client already on `home` before attaching, so it removed the second stray in the same command that attached you. Because your own client had been on `learn`, that attach also moved you off `learn`, leaving it with no attached client.

## Go further

- `:detach-client -a` does the same job as `-d` on `attach-session`, but from inside a session you are already attached to: it detaches every other client, leaving only the one that ran the command.
- `new-session -A -D -s name` combines the reattach-or-create form from Level 1, Task 6 with the same detach-others behaviour as `-d`.
- Client mode also has `x` and `X`, which detach a client and try to kill the shell it was started from, useful when a stray client's terminal has nowhere else to go.
