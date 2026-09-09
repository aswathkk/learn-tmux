---
title: "Minimal green"
description: "Twelve lines: a prefix on the home row, windows that count from one, splits that keep the directory, and a status line in one colour."
author:
  name: learntmux
  url: https://learntmux.dev
  avatar: ./avatar.png
repo: https://github.com/learntmux/dotfiles
cover: ./cover.png
coverAlt: "Two tmux panes side by side, a shell on the left and tmux.conf on the right, over a green status line reading learntmux 1:zsh 2:conf 3:logs"
categories: [minimal, keybindings]
tags: ["no-plugins", "vim-keys", "green"]
tmuxVersion: "3.4"
added: 2026-09-09
draft: true
---

This is the site's own config, and the one every screenshot on learntmux is
taken in. It exists to be read in one sitting: no plugin manager, no theme, and
nothing that needs a second file.

## The whole file

```bash
# prefix on the home row
set -g prefix C-a
unbind C-b
bind C-a send-prefix

# windows count from 1, and close the gaps
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on

# splits that keep the directory you were in
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"

# no escape delay, so vim stays usable
set -sg escape-time 10

# one colour, on the left, where the session name goes
set -g status-style "bg=default fg=#77808f"
set -g status-left " #[bg=#3ddc84,fg=#07080a,bold] #S #[default] "
set -g status-right "#h  %H:%M "

# reload without leaving tmux
bind r source-file ~/.tmux.conf \; display "reloaded"
```

## Why each line is here

`C-b` is a stretch on any keyboard and a page-up in every readline program.
`C-a` is under a resting little finger — and `bind C-a send-prefix` gives the
original back to the shell when you press it twice.

Windows starting at zero puts the first one under the key furthest from the
prefix. `base-index 1` fixes the reach; `renumber-windows` stops the gaps that
appear after you close one.

The two split bindings replace `%` and `"`, which nobody remembers, with the
characters that look like the split they make. The `-c` argument is the part
that matters: without it a new pane opens in whatever directory the session
started in, which is almost never the one you are in.

`escape-time 10` is the only line here that is really a bug fix. Without it
tmux waits half a second after every `Escape` to decide whether it was a meta
key, and vim feels broken.

The status line is one green block and the time. Everything else the default
prints — the window flags, the hostname, the date — either repeats what the
window list already says or is on the other end of the same screen.
