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
objective: "Write ~/.tmux.conf for prefix C-a, mouse on, a top status line with the session name, an r reload binding, pipe/hyphen split keys, vi keys and base-index 1. Restart the server and start session main."
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
  - "The three prefix lines are from Level 4, Task 4: `set -g prefix C-a`, `unbind C-b`, `bind C-a send-prefix`."
  - "The reload binding is from Level 4, Task 3: `bind r source-file ~/.tmux.conf`. Write the file, then restart with `:kill-server` and `tmux new -s main` (Level 1, Task 1) so it is read from the start."
  - "`base-index` only affects windows created after the server (re)starts, so sourcing the file into the running server is not enough. You need a genuinely new server."
  - "Once the file is loaded and the server restarted, the prefix is `C-a`, not `C-b`. So splitting is `C-a |` and `C-a -`, not `C-b`."
---

A new machine, an empty home directory, and you want tmux ready before lunch. Put every setting you have learned into one `.tmux.conf` and prove a fresh server actually reads it.

## Concept

`.tmux.conf` in the user's home directory runs once, when the server starts, not each time a session is created. That single fact drives this task: an option like `base-index` that only takes effect for new windows will not show up until you have started a genuinely new server, not just sourced the file into the one already running.

Nothing here introduces a new command. Level 4, Tasks 1 through 10 covered every piece: showing and setting options, writing and sourcing a configuration file, binding and unbinding keys, changing the prefix, and styling the status line with formats. This task asks you to combine them into one file and restart the server to prove it works.

## Do this

Write `~/.tmux.conf` so that, once the server has read it, all of the following are true.

| Requirement | Option or command | Where you learned it |
|---|---|---|
| Prefix key is `C-a`, and `C-a` twice sends it through | `set -g prefix C-a`, `unbind C-b`, `bind C-a send-prefix` | Level 4, Task 4 |
| Mouse enabled | `set -g mouse on` | Level 3 |
| Status line at the top | `set -g status-position top` | Level 4, Task 5 |
| Status line left side shows the session name | `set -g status-left '#{session_name}'` | Level 4, Task 6 |
| `r` (with the new prefix) reloads this file | `bind r source-file ~/.tmux.conf` | Level 4, Task 3 |
| The pipe key and the hyphen key split the window | `bind \| split-window -h`, `bind - split-window -v` | Level 4, Task 3 |
| Copy mode uses *vi(1)* keys | `set -g mode-keys vi` | Level 4, Task 9 |
| Windows number from 1 | `set -g base-index 1` | Level 4, Task 1 |

1. From the attached session `learn`, open a new window and edit the file with `open ~/.tmux.conf`. Add the lines from the table, one command per line.
2. Save and close the editor.
3. `base-index` only changes windows created after the server starts, and `.tmux.conf` itself only runs at server start. Sourcing the file now would pick up the prefix, mouse and status settings, but not `base-index` for a session that already exists. Kill the whole server so the next one starts clean: open the command prompt and run `:kill-server`.
4. At the plain shell, start a brand new session named `main`: `tmux new -s main`.
5. Check the result. The status line is at the top and shows `main` on the left. Press `C-a |` to split the window: since the prefix is now `C-a`, `C-b` does nothing.

**Done when** a fresh server has read the file: the server's pid has changed, the prefix is `C-a`, `mouse` is `on`, `status-position` is `top`, `mode-keys` is `vi`, `status-left` uses `#{session_name}`, `r`, `|` and `-` are bound in the prefix table to `source-file`, `split-window -h` and `split-window -v`, and session `main`'s first window is numbered `1`.

## What just happened

Killing the server with `:kill-server` and starting a new one with `tmux new -s main` forced tmux to read `.tmux.conf` from scratch, the only moment it does. Every `set -g` and `bind` you wrote ran in order before the new session existed, which is why `base-index 1` applied to window 0 of `main`, giving it index 1 instead.

`bind C-a send-prefix` matters because once `set -g prefix C-a` takes effect, tmux no longer treats `C-b` specially. Binding `C-a` to `send-prefix` keeps the old habit of "press the prefix twice to send it to the program" working with the new key. The `r` binding you wrote is now the fast way to pick up any future edit to the file without another restart, as long as `base-index` is not the thing you changed.

## Go further

The wiki's list of other features points past this course: alerts (`monitor-activity`, `monitor-bell`, `activity-action`), session groups (the `-t` flag to `new-session`), moving panes with `join-pane` and `break-pane`, `respawn-pane` to restart a dead program in place, `pipe-pane` and `capture-pane` for scripting, `display-menu` and `command-prompt` for custom prompts, and `wait-for` for coordinating scripts with a running server. Reading the *tmux(1)* man page section by section from here is the natural next step.
