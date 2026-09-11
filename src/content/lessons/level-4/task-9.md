---
title: "Use vi keys in copy mode"
slug: "vi-keys-in-copy-mode"
summary: "Switch copy mode and the prompt to vi keys, rebind v to start a selection, and copy a line the vi way."
seoDescription: 'Switch tmux copy mode to vi keys with mode-keys vi, bind v in the copy-mode-vi table to start a selection, and copy the line with Enter.'
level: 4
task: 9
difficulty: expert
estimatedMinutes: 4
concepts: [vi-keys, mode-keys, status-keys, copy-mode-vi, key-tables]
keys:
  - key: ":set -g mode-keys vi"
    command: "set-option -g mode-keys vi (and status-keys vi)"
    description: "Use the copy-mode-vi key table in copy mode and vi keys at the prompt"
  - key: ":bind -T copy-mode-vi v send -X begin-selection"
    command: "bind-key -T copy-mode-vi"
    description: "Rebind a copy mode key by sending a copy mode command with -X"
  - key: "Enter"
    command: "send-keys -X copy-selection-and-cancel (copy-mode-vi)"
    description: "Copy the selection and leave copy mode (vi table; h j k l move, 0 and $ go to line ends)"
wikiSections: ["*vi(1)* key bindings", "Copy mode key bindings", "Key bindings", "Copy and paste"]
challenge: false
objective: "`mode-keys` and `status-keys` are `vi`, `v` starts a selection, and the deploy key line is copied."
setup:
  - "echo 'deploy key: deploy-key-7f3a9c2e' > /home/alpine/notes.txt"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
  - "tmux new-session -d -s learn -n notes -x 120 -y 36 \"sh -c 'cat ~/notes.txt; exec sh'\""
startCommand: "tmux attach -t learn"
checks:
  - id: mode-keys-vi
    description: "The window option mode-keys is set to vi"
    kind: tmux
    command: "show-options -gwv mode-keys"
    expect: "^vi$"
  - id: status-keys-vi
    description: "The session option status-keys is set to vi"
    kind: tmux
    command: "show-options -gv status-keys"
    expect: "^vi$"
  - id: v-begins-selection
    description: "v in the copy-mode-vi table is bound to begin-selection"
    kind: tmux
    command: "list-keys -T copy-mode-vi v"
    expect: "begin-selection"
  - id: deploy-key-copied
    description: "The most recent paste buffer holds the deploy key line"
    kind: tmux
    command: "list-buffers -F '#{buffer_sample}'"
    expect: "deploy-key-7f3a9c2e"
hints:
  - "Editing the file changes nothing until you source it: `C-b :` then `source ~/.tmux.conf`."
  - "Three lines: `set -g mode-keys vi`, `set -g status-keys vi`, `bind -T copy-mode-vi v send -X begin-selection`."
  - "With vi keys, `k` moves up, `0` to line start, `$` to line end. On the deploy line: `0`, `v`, `$`, Enter."
---

## Concept

Copy mode keys live in two tables — `copy-mode` (emacs) and `copy-mode-vi` — and the `mode-keys` option picks which one is consulted. `set -g mode-keys vi` switches to the vi table:

- `h` `j` `k` `l` — move
- `0` / `$` — start and end of the line
- `/` and `?` — search forward and back
- `Enter` — copy and leave

`status-keys vi` does the same for the command prompt.

One rebind is worth making: in the vi table `v` is `rectangle-toggle` by default, and `Space` begins a selection. `bind -T copy-mode-vi v send -X begin-selection` gives `v` the meaning it has in vi. Copy mode commands are always sent with `send-keys -X`, so any binding in either table reads `send -X command`.

## The default copy-mode tables

Both tables default to `emacs` — unless `VISUAL` or `EDITOR` contained `vi` when the server started, in which case tmux picks vi for you.

## Do this

1. Run `open ~/.tmux.conf`, add these lines, and save with Ctrl-S:

   ```text
   set -g mode-keys vi
   set -g status-keys vi
   bind -T copy-mode-vi v send -X begin-selection
   ```

2. Press `C-b :`, type `source ~/.tmux.conf`, Enter.

   Editing the file alone changed nothing; this is what applies it.

3. Press `C-b [`, then `k` until the cursor is on `deploy key: deploy-key-7f3a9c2e`, then `0`.

   The cursor sits at the start of the line.

4. Press `v`, then `$`, then Enter.

   The line highlights, then copy mode ends with the line in a buffer.

## What just happened

The two `set` lines redirected copy mode and the prompt to the vi tables. The `bind -T copy-mode-vi` line added `v` to that table, and since `mode-keys` is now `vi`, that is the table copy mode consulted. Enter ran `copy-selection-and-cancel`, the vi table's equivalent of `M-w`.

## Go further

- `VISUAL=vi` or `EDITOR=vi` in the shell before the server starts sets both options with no file.
- `tmux lsk -T copy-mode-vi` lists the whole vi table; compare with `-T copy-mode`.
- `man tmux` lists every `-X` command, including unbound ones like `copy-pipe`.
