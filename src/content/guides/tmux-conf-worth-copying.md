---
title: "A tmux.conf worth copying, line by line"
description: "A short tmux config that fixes the defaults most people trip over, with the reason for every line, so you can keep the half you agree with."
category: config
published: 2026-09-08
relatedLessons: ["tmux-conf-file", "change-the-prefix-key", "status-line", "key-bindings"]
relatedGuides: ["tmux-workflows", "mosh-and-tmux"]
---

Most tmux configs you find are 200 lines and three plugin managers deep, and you
end up with a terminal you cannot debug. This one is short on purpose. Every
line fixes something the defaults get wrong for most people, and each comes with
its reason, so you can drop the half you disagree with.

Put it in `~/.tmux.conf`. Reload with `tmux source ~/.tmux.conf` or, once the
last binding is in, `C-b r`.

## The whole file

```bash
# --- keys ------------------------------------------------------------------
set -g prefix C-a
unbind C-b
bind C-a send-prefix

bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
unbind '"'
unbind %

bind r source-file ~/.tmux.conf \; display "reloaded"

# --- behaviour -------------------------------------------------------------
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on
set -g history-limit 50000
set -sg escape-time 10
set -g mouse on
set -g focus-events on

# --- looks -----------------------------------------------------------------
set -g status-style "bg=default fg=colour245"
set -g status-left "#[bold]#S "
set -g status-right "%H:%M "
setw -g window-status-current-style "fg=colour114 bold"
set -g pane-border-style "fg=colour238"
set -g pane-active-border-style "fg=colour114"
```

## Why each line is there

`C-b` collides with "back one character" in every readline shell, which is why
the first line moves the prefix to `C-a`. That collides with "beginning of line"
instead, and the third line is the escape hatch: pressing the prefix twice sends
a real `C-a` through to the program underneath. Pick one collision and make it
recoverable. If you live in Emacs, keep `C-b`.

`%` and `"` are unmemorable, so `|` and `-` take over splitting. The part that
matters in those two lines is `-c "#{pane_current_path}"`: new panes open in the
directory you were already in, not your home directory. The `unbind` lines are
optional; keep them if you want to force the new habit.

Editing a config you cannot reload is miserable. `bind r source-file` makes the
edit loop one keystroke. Add it first, because you will use it more than any
other binding while writing the rest.

Windows start at 0 by default, which puts window 0 at the far right of your
number row. `base-index 1` and `pane-base-index 1` make `C-b 1` the first
window.

Kill window 2 of four and you are left with 1, 3, 4. `renumber-windows on`
closes the gap.

The default scrollback of 2000 lines is about one verbose test run. Memory is
per pane and per line, so `history-limit 50000` costs a few megabytes for a busy
pane.

tmux waits after an Escape to see whether a key sequence follows. The 500 ms
default makes vim feel broken. `escape-time 10` is enough for any real terminal.

`mouse on` gets you scroll, click a pane, drag a border. It is not cheating, and
it does not stop the keyboard working. The one cost: selecting text now goes
through tmux's copy mode, so hold Shift for your terminal's own selection.

`focus-events on` lets vim and friends know when a pane gains focus, which is
what autoread and cursor-shape changes depend on.

On the status line, `bg=default` inherits your terminal's background, so tmux
stops fighting your theme. Everything else is one accent colour on the current
window and the active pane border, which is all the status line has to tell you.

## What is deliberately missing

Every line above is stock tmux, with no plugin manager. Plugins earn their place
for session persistence (`tmux-resurrect`) and little else at this size, and you
should be able to read your own config first.

`setw -g mode-keys vi` is missing on purpose. It is a good line if you use vim
and noise if you do not. [Level 4 covers it](/configure/vi-keys-in-copy-mode) so
you can decide.

There are no 256-colour or true-colour overrides either. `set -g
default-terminal` is the single most-copied broken line in tmux configs. Set it
only when something is rendering wrong, and set it to match the terminal you
really use.

Start here, run it for a week, and add only lines you can explain. If you want
to understand the syntax rather than trust it, [Level 4 builds this file
up](/configure) one option at a time in a live terminal.
