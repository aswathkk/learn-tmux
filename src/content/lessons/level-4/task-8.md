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
objective: "Borders red, the active border on yellow, and a bold title above every pane."
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
  - "Border styles use the same `fg=` and `bg=` terms as `status-style`, comma-separated for both: `'fg=red,bg=yellow'`."
  - "`pane-border-status top` turns the title bar on; `pane-border-format` is what it shows, with `#[bold]` and `#{pane_title}`."
  - "Four lines in `~/.tmux.conf`: `pane-border-style fg=red`, `pane-active-border-style 'fg=red,bg=yellow'`, `pane-border-status top`, `pane-border-format '#[bold]#{pane_title}#[default]'`. Then `:source ~/.tmux.conf`."
---

## Concept

`pane-border-style` styles every border, `pane-active-border-style` the active pane's. `pane-border-status top` adds a line to each border, and `pane-border-format` decides what it shows, using the same `#{...}` formats and `#[...]` styles as the status line.

Both style options are window options, set with `set -g`. The title bar costs one row per pane. `#{pane_title}` is what `pane-border-format` shows by default; the title itself defaults to the host name.

## Do this

1. Run `open ~/.tmux.conf`. Add these lines and save with Ctrl-S:

   ```text
   set -g pane-border-style fg=red
   set -g pane-active-border-style 'fg=red,bg=yellow'
   set -g pane-border-status top
   set -g pane-border-format '#[bold]#{pane_title}#[default]'
   ```

2. Press `C-b :`, type `source ~/.tmux.conf`, Enter. A bold title appears above each pane and the borders turn red.
3. Press `C-b Right` and `C-b Left`. The yellow background follows the active pane.

## What just happened

Every border took `fg=red`; the active pane's added `bg=yellow` on top. `pane-border-status` turned the title line on and `pane-border-format` filled it: `#[bold]` on, the title, `#[default]` off again so nothing after stays bold.

## Go further

- `select-pane -T name` sets a pane's title by hand.
- `pane-border-lines` changes the characters the border is drawn with.
- All the style attributes and colours from the status line work here too.
