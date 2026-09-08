---
title: "Configure the pane border"
slug: "pane-border"
summary: "Colour the pane borders, highlight the active one, and give every pane a bold title bar."
level: 4
task: 8
difficulty: expert
estimatedMinutes: 4
concepts: [pane-border, styles, pane-border-status, pane-border-format]
keys:
  - key: ":set -g pane-border-style fg=red"
    command: "set-option -g pane-border-style"
    description: "Style of inactive pane borders"
  - key: ":set -g pane-active-border-style 'fg=red,bg=yellow'"
    command: "set-option -g pane-active-border-style"
    description: "Style of the active pane border"
  - key: ":set -g pane-border-status top"
    command: "set-option -g pane-border-status (with pane-border-format)"
    description: "Show a status line in each pane border using pane-border-format"
wikiSections: ["Configuring the pane border", "Colours and styles", "List of style and format options"]
challenge: false
objective: "From ~/.tmux.conf colour the borders, give the active border a background, and show the pane title in bold at the top of every pane."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux split-window -h -t learn:0"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
startCommand: "tmux attach -t learn"
checks:
  - id: border-style
    description: "pane-border-style has a foreground colour set"
    kind: tmux
    command: "show-options -gwv pane-border-style"
    expect: "fg="
  - id: active-border-style
    description: "pane-active-border-style has a yellow background"
    kind: tmux
    command: "show-options -gwv pane-active-border-style"
    expect: "bg=yellow"
  - id: border-status-top
    description: "pane-border-status is set to top"
    kind: tmux
    command: "show-options -gwv pane-border-status"
    expect: "^top$"
  - id: border-format-bold
    description: "pane-border-format bolds the pane title"
    kind: tmux
    command: "show-options -gwv pane-border-format"
    expect: "bold"
hints:
  - "Every pane border is a style, like the status line in Level 4, Task 5. Set it with `set-option -g pane-border-style` and `pane-active-border-style`."
  - "A style is `fg=colour` or `bg=colour`, comma-separated for both: `'fg=red,bg=yellow'`."
  - "`pane-border-status top` turns on the border status line; `pane-border-format` is the format shown in it, same syntax as `status-left` from Task 6."
  - "Use the wiki's own line: `set -g pane-border-format '#[bold]#{pane_title}#[default]'`, then run `:source ~/.tmux.conf`."
---

Panes have had borders all along: plain lines in the default colour, with no label. You can style and label them the same way you styled the status line.

## Concept

A pane border is drawn around every pane, and tmux styles it with two window options: `pane-border-style` for every border except the active pane's, and `pane-active-border-style` for the active pane's border. Both take a style, the same syntax as `status-style` from Level 4, Task 5: `fg=colour` for the foreground, `bg=colour` for the background, comma-separated to set both.

A border can also carry its own status line, separate from the session's status line. The `pane-border-status` option turns it on, set to `top` or `bottom`. What appears on it comes from `pane-border-format`, a format string using the same `#{...}` and `#[...]` syntax as `status-left` and `status-right` from Level 4, Task 6: `#{...}` interpolates a value, `#[...]` embeds a style that applies to the text after it until the next embedded style.

The pane title defaults to the host name. `#{pane_title}` is the format that reads it, and it is already what `pane-border-format` shows by default. Wrapping it in `#[bold]` and `#[default]` bolds it, then returns to the default style for anything after.

## Do this

1. Read the config file already in place. Run `cat ~/.tmux.conf`. It has one comment line and nothing else.

2. Open the file with `open ~/.tmux.conf`, add four lines, then save and close the editor.

   ```text
   set -g pane-border-style fg=red
   set -g pane-active-border-style 'fg=red,bg=yellow'
   set -g pane-border-status top
   set -g pane-border-format '#[bold]#{pane_title}#[default]'
   ```

3. Load the file. Press `C-b :`, type `source ~/.tmux.conf`, then press Enter. A line appears above every pane, and the borders take on colour.

4. Move between the two panes with `C-b Left` and `C-b Right`. The active pane's border turns yellow where the others stay plain red.

**Done when** `pane-border-style`, `pane-active-border-style`, `pane-border-status` and `pane-border-format` are all set as above.

## What just happened

`set -g pane-border-style fg=red` and `set -g pane-active-border-style 'fg=red,bg=yellow'` are window options, so `set -g` applies them to every window as it infers the type, the same way Task 1 explained. Every border not belonging to the active pane picks up `fg=red`; the active pane's border adds a yellow background on top, which is what makes it stand out.

`set -g pane-border-status top` puts a status line at the top of every pane border rather than hiding it, at the cost of one row of usable pane height per pane, which is expected. `pane-border-format` fills that line: by default it already shows the pane title, so the change here is the embedded style around it. `#[bold]` turns bold on for the text that follows, `#{pane_title}` inserts the title itself, and `#[default]` returns to the border's own style so nothing after stays bold. Level 1, Task 9 and Level 2, Task 4 already showed `pane-border-status` labelling panes; this task is the first to style what it shows.

## Go further

- `select-pane -T title` sets a pane's title by hand, so `#{pane_title}` shows something other than the host name.
- `pane-border-lines` (not covered by the wiki excerpt here) changes the characters used to draw the border itself.
- The same style syntax works with `bright`, `underscore`, `reverse` and `italics` as attributes, and `colour0` to `colour255` or a hex value like `#882244` as a colour.
