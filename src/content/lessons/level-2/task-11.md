---
title: "Kick out a stale client"
slug: "detach-another-client"
summary: "See two other clients attached to a session, detach one from client mode, then take the session over with attach -d."
seoDescription: 'See every client attached to a tmux session, kick a stale one off from client mode with C-b D, and take the session over with attach -d.'
level: 2
task: 11
difficulty: intermediate
estimatedMinutes: 4
concepts: [client, client-mode, detach-client, attach-d]
keys:
  - key: "C-b D"
    command: "choose-client"
    description: "Client mode: Enter or d detaches the selected client, D the tagged ones; q exits"
  - key: ":attach -d -t name"
    command: "attach-session -d"
    description: "Move this client to that session and detach every other client from it"
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
  - "Do not go looking for a shell to type `tmux attach` into: inside a pane it refuses to nest. Run `attach` at `C-b :`."
  - "`C-b D` lists every client on the server. Move to one on `home` and press Enter to detach it."
  - "`C-b :` then `attach -d -t home` moves your own client to `home` and detaches everyone else on it, which leaves `learn` with none."
---

## Concept

A client is one terminal attached to the server. Three ways to get rid of one:

- `C-b D` — client mode, a list of every client on the server; Enter or `d` detaches the selected one
- `attach -d -t name` at `C-b :` — attach yourself and detach every other client on that session
- `detach-client -a` at `C-b :` — detach everyone except you

**Run these at `C-b :`, not in a pane's shell.** A pane already has `$TMUX` set, so `tmux attach` there refuses to nest.

A session can have several clients, and it is drawn at the size of the smallest one — which is why a stray client makes a session mysteriously cramped.

## Detaching is not moving a client

Even if you forced the nested attach through, it would only add a second client rather than move the one you are sitting at. Detaching a client changes nothing inside the session itself.

## Do this

1. Press `C-b D`, move to one of the clients on `home`, press Enter.

   Three clients were listed: yours on `learn`, two on `home`. The one you picked goes, and its window in `learn` closes with it.

2. Press `q` if the list is still open, then `C-b :`, type `attach -d -t home`, Enter.

   The screen switches to `home`, and you are its only client.

## What just happened

`C-b D` runs `choose-client`; detaching from it is what `C-b d` does to your own client. `attach` at the prompt is `attach-session`, which reattaches the client that ran it: `-d` detached the remaining stray, and your own client moved off `learn`, leaving it with none.

## Go further

- `detach-client -a` from inside a session detaches everyone but you.
- `new -A -D -s name` combines attach-or-create with detach-others.
- In client mode, `x` and `X` also try to kill the shell the client was started from.
