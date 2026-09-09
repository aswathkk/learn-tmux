---
title: "mosh plus tmux: sessions that survive the network"
description: "Pair mosh with tmux so a closed laptop, a train tunnel or a new IP address does not cost you the session. Setup, and where each tool stops."
categories: [remote, setup]
published: 2026-09-01
draft: true
relatedLessons: ["detach-and-reattach", "list-and-switch-sessions"]
relatedGuides: ["tmux-workflows", "tmux-conf-worth-copying"]
---

SSH is a TCP connection. A TCP connection is a pair of addresses, and the moment
one of them changes, the connection is dead. Close a laptop, walk between two
wifi networks, get on a train: the session is gone and whatever it was running
went with it.

tmux fixes half of that. mosh fixes the other half. Neither one fixes both,
which is why they are usually run together.

## What each tool protects

tmux keeps the programs alive. It runs a server on the remote host. Your
terminal is only a client attached to it, and detaching, crashing or vanishing
does not touch the session. The build keeps building whether anyone is watching
or not.

mosh keeps the connection alive. It authenticates over SSH once, then hands off
to its own UDP protocol that is not tied to an IP address. Change networks and
mosh notices, re-syncs and carries on. It also predicts your keystrokes locally,
so a 300 ms link stops feeling like one.

Without tmux, mosh reconnects you to a shell that lost everything. Without mosh,
tmux keeps your work safe, but you have to notice the freeze, kill the SSH
client and reattach by hand. With both, you close the lid, open it somewhere
else, and the screen is still there.

## Setting it up

Install mosh on both machines. It has to exist on the server too, because the
server half is a real process:

```bash
# Debian or Ubuntu
sudo apt install mosh

# macOS
brew install mosh

# Alpine
apk add mosh
```

mosh opens a UDP port in the range 60000-61000 for each session. If the server
has a firewall, that range needs to be open:

```bash
sudo ufw allow 60000:61000/udp
```

Now connect, and attach to a session in one step:

```bash
mosh buildbox -- tmux new -A -s work
```

`new -A` attaches to `work` if it exists and creates it if it does not, so the
same command is correct on the first connection and every one after it.
[Level 1 covers listing and switching sessions](/basics/list-and-switch-sessions)
if that flag is new to you.

Make it a shell function and you never type it again:

```bash
# ~/.zshrc or ~/.bashrc
work() { mosh "$1" -- tmux new -A -s work; }
```

## What changes once both are running

Scrollback belongs to tmux now, not your terminal. mosh only ever shows the
current screen, so your terminal's scrollbar has nothing in it. Use tmux's copy
mode instead: `C-b [`, then arrows or PageUp. This catches everyone once, which
is a good reason to learn [copy mode](/advanced/copy-mode) properly rather than
reaching for the mouse.

mosh does not forward ports or agents. No `-L`, no `-R`, no `ForwardAgent`. If
you need a tunnel, keep a plain SSH connection open alongside it.

A session survives a dropped connection, not a reboot. The tmux server is a
process: it outlives your connection, not the machine. For work that has to
survive a reboot, use a systemd unit rather than a multiplexer.

The mosh server exits when the session ends. Detaching from tmux with `C-b d`
leaves the tmux session running and ends your mosh session cleanly, which is
usually what you want. Close the lid instead and the mosh server waits, then
reconnects when you come back.

## A sane default

```bash
# ~/.ssh/config keeps mosh's SSH handshake short
Host buildbox
    HostName buildbox.internal
    User you
    ServerAliveInterval 30
```

```bash
work() { mosh "$1" -- tmux new -A -s work; }
```

That is the whole setup: one package on each machine, one SSH config block, one
shell function.
