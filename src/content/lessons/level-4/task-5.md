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
objective: "The status line is at the top, red, and shows only `%H:%M` on the right."
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
  - "`status-right` replaces the whole right side; setting it to `'%H:%M'` drops the title and date, it does not add to them."
  - "Three options: `status-position top`, `status-style bg=red`, `status-right '%H:%M'`, each with `set -g` in the file."
  - "`open ~/.tmux.conf`, add the three lines, Ctrl-S, then `C-b :` `source ~/.tmux.conf`."
---

## Concept

Three options draw the bar: `status-position` (`top` or `bottom`), `status-style` (a style such as `bg=red`), and `status-right` (a format string; `%H:%M` is the time). Set them with `set -g` in `~/.tmux.conf` and `source` it.

A style is terms separated by spaces or commas: `fg=` and `bg=` take a colour, and `bold`, `bright`, `underscore`, `reverse` and `italics` stand alone. Colours are the eight names, `brightNAME`, `colour0` to `colour255`, or hex like `#882244`.

The default `status-right` is `"#{=21:pane_title}" %H:%M %d-%b-%y`: pane title, time, date. The `%` codes are the ones `date` uses.

## Do this

1. Run `open ~/.tmux.conf`. Add these lines and save with Ctrl-S:

   ```text
   set -g status-position top
   set -g status-style bg=red
   set -g status-right '%H:%M'
   ```

2. Press `C-b :`, type `source ~/.tmux.conf`, Enter. The bar jumps to the top, turns red, and its right end is just the time.

## What just happened

`status-style bg=red` replaced the default `bg=green,fg=black`; one term, so only the background changed. `status-right '%H:%M'` overwrote the whole format, dropping the title and date. Sourcing applied all three `set -g` lines to every session on the server.

## Go further

- `set -g status off` hides the bar entirely.
- `status-left-style` and `status-right-style` override `status-style` for their part of the bar.
- `window-status-current-style underscore` underlines the current window's entry.
