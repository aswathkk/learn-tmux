---
title: "Customize the status line"
slug: "status-line"
summary: "Move the status line to the top, colour it, and simplify the right side to the time."
level: 4
task: 5
difficulty: expert
estimatedMinutes: 4
concepts: [status-line, styles, colours, options]
keys:
  - key: ":set -g status-position top"
    command: "set-option -g status-position"
    description: "Put the status line at the top of the screen"
  - key: ":set -g status-style bg=red"
    command: "set-option -g status-style"
    description: "Style the whole status line (bg, fg, bold, underscore and so on)"
  - key: ":set -g status-right '%H:%M'"
    command: "set-option -g status-right"
    description: "Replace the right side with a date format"
wikiSections: ["Customizing the status line", "Colours and styles", "List of style and format options", "Common configuration changes"]
challenge: false
objective: "Put the status line at the top with a red background and only the time on the right, from ~/.tmux.conf."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
startCommand: "tmux attach -t learn"
checks:
  - id: status-top
    description: "status-position is top"
    kind: tmux
    command: "show-options -gv status-position"
    expect: "^top$"
  - id: status-red
    description: "status-style includes bg=red"
    kind: tmux
    command: "show-options -gv status-style"
    expect: "bg=red"
  - id: status-right-time
    description: "status-right is exactly %H:%M"
    kind: tmux
    command: "show-options -gv status-right"
    expect: "^%H:%M$"
hints:
  - "Three options: `status-position`, `status-style`, `status-right`. Each takes `set -g option value` in `~/.tmux.conf`."
  - "A style is terms separated by spaces or commas: `bg=red` sets the background colour."
  - "`status-right` is a format string. Setting it to `'%H:%M'` replaces the whole right side, not just adds to it."
  - "Full lines: `set -g status-position top`, `set -g status-style bg=red`, `set -g status-right '%H:%M'`. Save, then `C-b :` and run `source ~/.tmux.conf`."
---

The default status line puts the session name on the left, the window list in the middle, and the pane title, time and date on the right, in green. Every part of it is an option, so you can move it, recolour it, or replace its contents.

## Concept

The status line is drawn from options. `status-position` picks which edge of the screen it sits on. `status-style` sets the colour and attributes of the whole bar. `status-right` is a format string: its default value mixes literal text with format variables like `%H:%M`, the same `strftime` codes `date` uses.

Colour and attribute are set with a style. A style is a list of terms separated by spaces or commas. `bg=colour` sets the background, `fg=colour` sets the foreground, and `bright`, `bold`, `underscore`, `reverse` and `italics` set attributes on their own. A colour is one of the eight standard names (`red`, `green`, `blue` and so on), a `brightNAME` variant, `colourN` for the 256-colour palette, or a hex value like `#882244`.

You already know `set -g` from Level 4, Task 1 and `source-file` from Level 4, Task 2. Every option here is a session option, set with `-g` in `~/.tmux.conf` and loaded with `source`.

## Do this

1. Open the configuration file. Run `C-b :` then type `source ~/.tmux.conf` and press Enter, once, just to see it currently does nothing.

2. Before editing, look at the current right side of the status line:

   ```bash
   tmux show-options -gv status-right
   ```

   You see something like `"#{=21:pane_title}" %H:%M %d-%b-%y`. `%H:%M` and `%d-%b-%y` are the same date codes as the shell `date` command.

3. Open `~/.tmux.conf` with `open ~/.tmux.conf` and add three lines:

   ```text
   set -g status-position top
   set -g status-style bg=red
   set -g status-right '%H:%M'
   ```

   Quote the value if it has spaces; none of these three do, but get in the habit.

4. Save and close the editor.

5. Reload the file: press `C-b :`, type `source ~/.tmux.conf`, press Enter. The status line jumps to the top of the screen, turns red, and the right side shrinks to just the hours and minutes.

**Done when** `status-position` is `top`, `status-style` includes `bg=red`, and `status-right` is exactly `%H:%M`.

## What just happened

`set-option -g status-position top` moves the bar tmux draws for an attached client from the bottom edge to the top edge; nothing else about the session changes. `set-option -g status-style bg=red` replaces the default `bg=green,fg=black` style used to draw the whole bar, one style term per comma or space, so `bg=red` alone keeps the default foreground colour and only changes the background.

`set-option -g status-right '%H:%M'` replaces the format string entirely. The default value shows the pane title, the time and the date one after another; overwriting the option with just `%H:%M` drops the title and date, it does not append to them. The same applies to `status-left` if you change it later.

Sourcing the file re-runs every `set -g` line against the running server, so the change applies immediately to every session, not just `learn`.

## Go further

- `set -g status off` hides the status line completely; there is nothing left to draw.
- `set -g window-status-current-style underscore` underlines the active window's entry in the window list, independently of `status-style`.
- `status-style`, `status-left-style` and `status-right-style` layer: the more specific option overrides `status-style` for its own part of the bar.
- Level 4, Task 6 covers format variables like `#{session_name}` and embedded styles (`#[fg=red]`) inside `status-left` and `status-right`.
