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
    description: "Client mode: Enter or d detaches the selected client, D the tagged ones; q exits"
  - key: "tmux attach -d -t name"
    command: "attach-session -d"
    description: "Attach and detach every other client from that session"
  - key: ":detach-client -a"
    command: "detach-client -a"
    description: "Detach all clients except the one running the command"
wikiSections: ["Detaching other clients", "Attaching and detaching", "The tmux server and clients"]
challenge: false
objective: "You are the only client on `home`, and no client is left on `learn`."
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
  - "You need a shell to type `tmux attach` from. Switch to window 0 of `learn` first with `C-b 0`."
  - "`C-b D` lists every client on the server. Move to one on `home` and press Enter to detach it."
  - "`tmux attach -d -t home` attaches you to `home` and detaches everyone else on it, including your own client on `learn`."
---

## Concept

`C-b D` opens client mode, a list of every terminal attached to the server. Enter or `d` detaches the selected one. `tmux attach -d -t name` attaches you and detaches every other client on that session in one move.

A session can have several clients, and it is drawn at the size of the smallest one, which is why stray clients make a session cramped. Detaching a client changes nothing inside the session.

`detach-client -a` at the prompt is the inside-out version: it detaches every client except the one running it.

## Do this

1. Press `C-b D`. Three clients: yours on `learn`, two on `home`. Move to one on `home`, press Enter. It goes, and its window in `learn` closes too.
2. Press `q` if the list is still open, then `C-b 0` for a shell. Run `tmux attach -d -t home`. The screen switches to `home`, and you are its only client.

## What just happened

`C-b D` runs `choose-client`; detaching from it is what `C-b d` does to your own client. `attach-session -d` detached the remaining stray before attaching you, and since your client had been on `learn`, `learn` was left with none.

## Go further

- `detach-client -a` from inside a session detaches everyone but you.
- `new -A -D -s name` combines attach-or-create with detach-others.
- In client mode, `x` and `X` also try to kill the shell the client was started from.
