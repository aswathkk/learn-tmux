---
title: "Challenge: write your own tmux.conf"
slug: "challenge-write-your-tmux-conf"
summary: "Author a complete configuration file from scratch and prove it loads on a freshly started server."
level: 4
task: 11
difficulty: expert
estimatedMinutes: 12
concepts: [configuration-file, prefix, key-bindings, status-line, vi-keys, options, server-start]
keys: []
wikiSections: ["The configuration file", "Changing the prefix key", "Key bindings", "Customizing the status line", "Formats", "*vi(1)* key bindings", "List of useful options", "Other features"]
challenge: true
objective: "A fresh server reads your `~/.tmux.conf`, and session `main` starts at window 1."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux display-message -p '#{pid}' > /home/alpine/.server-pid"
startCommand: "tmux attach -t learn"
checks:
  - id: new-server-prefix
    description: "The server restarted (a new pid) and the new prefix is C-a"
    kind: shell
    command: "[ \"$(tmux display-message -p '#{pid}')\" != \"$(cat /home/alpine/.server-pid)\" ] && tmux show-options -gv prefix"
    expect: "^C-a$"
  - id: mouse-position-modekeys
    description: "mouse is on, status-position is top, mode-keys is vi"
    kind: shell
    command: "printf '%s\\n' \"$(tmux show-options -gv mouse)\" \"$(tmux show-options -gv status-position)\" \"$(tmux show-options -gwv mode-keys)\""
    expect: "^on\\ntop\\nvi$"
  - id: status-left-session-name
    description: "status-left uses the session_name format"
    kind: tmux
    command: "show-options -gv status-left"
    expect: "session_name"
  - id: split-and-reload-keys
    description: "r sources the file, | splits horizontally, - splits vertically"
    kind: shell
    command: "tmux list-keys -T prefix r; tmux list-keys -T prefix '|'; tmux list-keys -T prefix -"
    expect: "source-file[\\s\\S]*split-window -h[\\s\\S]*split-window -v"
  - id: base-index-took-effect
    description: "Session main's first window is index 1"
    kind: tmux
    command: "list-windows -t main -F '#{window_index}'"
    expect: "^1$"
hints:
  - "`base-index` only affects windows made after the server starts, so `source` is not enough. Kill the server and start `main` new."
  - "The prefix lines: `set -g prefix C-a`, `unbind C-b`, `bind C-a send-prefix`. The reload key: `bind r source-file ~/.tmux.conf`."
  - "Once the new server is up, the prefix is `C-a`: splitting is `C-a |` and `C-a -`."
  - "Write the file with `open ~/.tmux.conf`, then `:kill-server` and `tmux new -s main`."
---

## Concept

`.tmux.conf` runs once, when the server starts. Every line here is one you have already written; the new part is that `base-index` only applies to windows created after the file runs, so proving the file works takes a genuinely new server.

A sourced file changes the running server, but windows that already exist keep their numbers. `kill-server` then `tmux new` is the only way to see every line take effect from zero.

## Do this

Write `~/.tmux.conf` so that a fresh server has all of this:

| Requirement | Line |
|---|---|
| Prefix is `C-a`, and `C-a C-a` sends it through | `set -g prefix C-a`, `unbind C-b`, `bind C-a send-prefix` |
| Mouse on | `set -g mouse on` |
| Status line at the top | `set -g status-position top` |
| Session name on the left of the bar | `set -g status-left '#{session_name}'` |
| `r` reloads the file | `bind r source-file ~/.tmux.conf` |
| `\|` and `-` split the window | `bind \| split-window -h`, `bind - split-window -v` |
| Copy mode uses vi keys | `set -g mode-keys vi` |
| Windows number from 1 | `set -g base-index 1` |

1. Run `open ~/.tmux.conf`, write the lines from the table, save with Ctrl-S.
2. Press `C-b :`, type `kill-server`, Enter.
3. Run `tmux new -s main`. The bar is at the top and reads `main`; the window list starts at `1`.
4. Press `C-a |`. The window splits; `C-b` now does nothing.

## What just happened

The new server ran every line before creating `main`, so `base-index 1` was in force when its first window was made. `bind C-a send-prefix` keeps the press-twice habit working on the new key. `r` now reloads the file without a restart, for everything except `base-index` on windows that already exist.

## Go further

- Past this course: `monitor-activity` and `monitor-bell` for alerts, session groups (`new-session -t`), `respawn-pane`, `pipe-pane`, `capture-pane`, `display-menu`, `wait-for`. `man tmux`, section by section, is the natural next read.
