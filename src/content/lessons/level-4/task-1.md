---
title: "Show, set and unset options"
slug: "show-set-and-unset-options"
summary: "Read option values of each type, set a server option and a session option, watch renumbering happen, and unset one back to its default."
level: 4
task: 1
difficulty: expert
estimatedMinutes: 4
concepts: [options, option-types, show-options, set-option, unset]
keys:
  - key: ":show -g option"
    command: "show-options -g (show -s server, show -wg window)"
    description: "Show a global option; without a name lists all options of that type"
  - key: ":set -g option value"
    command: "set-option -g"
    description: "Set a global session or window option (server options need no -g; -s marks them)"
  - key: ":set -gu option"
    command: "set-option -gu"
    description: "Unset a global option, restoring its default"
wikiSections: ["Types of option", "Showing options", "Changing options", "List of useful options"]
challenge: false
objective: "`escape-time` 10, `renumber-windows` on with the gap closed, `status-position` back to bottom."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux new-window -d -t learn -n scratch"
  - "tmux new-window -d -t learn -n logs"
  - "tmux set-option -g status-position top"
startCommand: "tmux attach -t learn"
checks:
  - id: escape-time-set
    description: "The server option escape-time is 10"
    kind: tmux
    command: "show-options -sv escape-time"
    expect: "^10$"
  - id: renumber-on
    description: "The global session option renumber-windows is on"
    kind: tmux
    command: "show-options -gv renumber-windows"
    expect: "^on$"
  - id: windows-closed-up
    description: "Killing window 1 (scratch) left windows 0 and 1 with no gap"
    kind: shell
    command: "tmux list-windows -t learn -F '#{window_index}' | tr '\\n' ','"
    expect: "^0,1,$"
  - id: status-position-default
    description: "status-position is back to its default, bottom"
    kind: tmux
    command: "show-options -gv status-position"
    expect: "^bottom$"
hints:
  - "Everything is typed at `C-b :`. You do not need `-s` or `-w` when you name the option; tmux knows its type."
  - "`show -g name` reads, `set -g name value` writes, `set -gu name` unsets."
  - "`set -s escape-time 10`, `set -g renumber-windows on`, `kill-window -t :1`, `set -gu status-position`."
---

## Concept

`show -g name` at the prompt reads an option and `set -g name value` writes it. `set -gu name` unsets it, back to the default. Every part of tmux you have used, from the prefix to the status line, is an option like these.

Options come in types: server options apply to everything; session and window options have a global set plus overrides per session or window; pane options work like window ones. When you name the option, tmux knows which type it is, so `show` and `set` need only `-g`.

`-g` matters on `set`: without it you change only the current session or window, and some options have no such override.

## Do this

1. Press `C-b :`, type `show -g status-position`, Enter. It says `top`, which is where the bar is now.
2. Press `C-b :`, type `set -s escape-time 10`, Enter. No output; the server option is set.
3. Press `C-b :`, type `set -g renumber-windows on`, Enter.
4. Press `C-b :`, type `kill-window -t :1`, Enter. The list goes from `0 1 2` to `0 1`: `logs` moved down to fill the gap.
5. Press `C-b :`, type `set -gu status-position`, Enter. The bar jumps back to the bottom.

## What just happened

`escape-time` is a server option, so `-s` marked it and it applies everywhere. `renumber-windows` made `kill-window` renumber what was left instead of leaving index 2 in place. `-u` removed your override rather than setting a value, so `status-position` fell back to the shipped default without you needing to know it.

## Go further

- `show -s`, `show -g` and `show -wg` with no name list every option of that type.
- `escape-time` is how long tmux waits to tell Escape from the start of an arrow-key sequence; 10 ms suits local terminals.
- `synchronize-panes on` sends your typing to every pane in the window at once. Handle with care.
- `base-index 1` starts window numbering at 1.
