---
title: "Four tmux workflows that stick"
description: "Session per project, a named window layout, a scratch session, and a script that rebuilds all of it. The commands, and why each is shaped that way."
categories: workflow
published: 2026-09-01
draft: true
relatedLessons: ["list-and-switch-sessions", "rename-session-and-window", "window-layouts", "tmux-command-prompt"]
relatedGuides: ["tmux-conf-worth-copying", "mosh-and-tmux"]
---

Learning the keys is the easy part. Most people drift away from tmux because
they never settle on a shape for it, so every day starts with a blank session
and ends with nine windows called `sh`. The four patterns below are the ones
that hold up over months of daily use.

## One session per project

The unit that matters is the project, not the terminal window. One session per
repository, named after it:

```bash
tmux new -A -s api
tmux new -A -s dashboard
```

`new -A` attaches if it exists and creates it if it does not, so the same command
works on Monday morning and after lunch. Switching between them is `C-b s` for
the tree, or by name from anywhere:

```bash
tmux switch-client -t api
```

Give it a week and each project keeps its own working directories, its own
scrollback, its own running processes. Instead of rebuilding that context every
morning, you return to it.

## Name the windows, not the panes

Panes are for things you watch at the same time. Windows are for things you
switch between. A layout that holds up:

```
0:editor   1:server   2:git   3:sh
```

Name them as you make them, `C-b ,`, or up front:

```bash
tmux new -d -s api -n editor
tmux neww -t api -n server
tmux neww -t api -n git
```

The reason to name them is `C-b w`. In tree mode, four named windows are a menu;
four windows called `sh` are a guessing game.
[Level 2's renaming lesson](/intermediate/rename-session-and-window) covers the
two keys that do it.

## A scratch session you never close

Keep one session that is not a project, for the thing you need for ninety
seconds: reading a log, testing a command, checking a certificate.

```bash
tmux new -A -s scratch
```

It stops you opening a fourth window in a project session for something
unrelated, which is how a project session stops being about the project. Because
it is always there, `C-b s` and pick it, and you are back in a few seconds.

## Script the layout once

If a project always wants the same three windows, write it down. A plain shell
script beats any plugin here:

```bash
#!/usr/bin/env bash
# ~/bin/work-api
set -e
session=api

if tmux has-session -t "$session" 2>/dev/null; then
    exec tmux attach -t "$session"
fi

tmux new-session  -d -s "$session" -n editor -c ~/code/api
tmux send-keys    -t "$session":editor 'nvim .' C-m

tmux new-window   -t "$session" -n server -c ~/code/api
tmux send-keys    -t "$session":server 'npm run dev' C-m

tmux new-window   -t "$session" -n git -c ~/code/api

tmux select-window -t "$session":editor
exec tmux attach -t "$session"
```

`has-session` is why running the script twice attaches instead of building a
second copy. `-d` builds the whole session detached, so nothing flashes past
while it sets up. `send-keys` with `C-m` sends a real Enter, using the same
target syntax as [break, join and send keys](/advanced/break-join-and-send-keys).

## Naming, in all four cases

All four patterns come down to the same habit: name things. Sessions after
projects, windows after jobs, one script per project that you write once. Once
the names exist, `C-b s` and `C-b w` are menus rather than guesswork, and the
layout stops being something you have to hold in your head.
