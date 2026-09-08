---
title: "Use vi keys in copy mode"
slug: "vi-keys-in-copy-mode"
summary: "Switch copy mode and the prompt to vi keys, rebind v to start a selection, and copy a line the vi way."
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
    description: "Copy the selection and leave copy mode; h j k l move, 0 and $ go to line ends, / and ? search, Space also begins a selection"
wikiSections: ["*vi(1)* key bindings", "Copy mode key bindings", "Key bindings", "Copy and paste"]
challenge: false
objective: "Set mode-keys and status-keys to vi, bind v to begin-selection in the copy-mode-vi table, then copy the deploy key line using vi keys."
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
  - "Add the option lines to `~/.tmux.conf`, then run `source ~/.tmux.conf` at the command prompt. Editing the file alone changes nothing until it is sourced."
  - "The three lines are `set -g mode-keys vi`, `set -g status-keys vi` and `bind -T copy-mode-vi v send -X begin-selection`."
  - "In copy mode with vi keys, `k` moves up, `0` goes to the start of the line, `$` goes to the end. Press `v` where you want the selection to start."
  - "After moving the cursor onto the deploy key line: `0` then `v` then `$` then `Enter`. `Enter` runs `copy-selection-and-cancel`, same as `M-w` in the *emacs(1)* table."
---

Level 3, Task 1 used copy mode with *emacs(1)* keys: `C-Space` to start a selection, arrow keys to move, `M-w` to copy. tmux ships a second key table for people who prefer *vi(1)*. Switching to it changes copy mode and the command prompt at once.

## Concept

Copy mode key bindings live in key tables, same as the prefix and root tables from Level 4, Task 3. There are two: `copy-mode` for *emacs(1)*-style keys, and `copy-mode-vi` for *vi(1)*-style keys. The option `mode-keys` picks which table copy mode uses. A second option, `status-keys`, picks vi or emacs keys for the command prompt. Both default to `emacs`. If the `VISUAL` or `EDITOR` environment variable contained `vi` when the server started, tmux sets both to `vi` automatically.

Copy mode commands are not ordinary shell commands. They are passed to `send-keys` with the `-X` flag, so a binding like `C-a` in the `copy-mode` table really runs `send-keys -X start-of-line`. The `copy-mode-vi` table binds the same commands to different keys: `h j k l` move the cursor instead of the arrow keys, `0` and `$` move to the start and end of the line, `/` and `?` search forward and backward, and `Space` begins a selection.

`v` is not bound to anything useful in the vi table by default: it runs `rectangle-toggle`, the same command bound to `R` in the emacs table. Real vi uses `v` to start a visual selection, so this task rebinds it with `bind-key -T copy-mode-vi`, the same `-T` flag from Level 4, Task 3, naming the table to bind in.

## Do this

1. Open `~/.tmux.conf` and add three lines to it, so the file has your comment from Level 4, Task 2 plus these:

   ```text
   set -g mode-keys vi
   set -g status-keys vi
   bind -T copy-mode-vi v send -X begin-selection
   ```

2. Load the file. Press `C-b :`, type the command below and press Enter.

   ```text
   source ~/.tmux.conf
   ```

3. Check it took effect. Press `C-b :`, run `show -gwv mode-keys`, and read `vi` on the status line.

4. Enter copy mode with `C-b [`. The pane freezes; the cursor sits on the last line.

5. Move the cursor onto the line that reads `deploy key: deploy-key-7f3a9c2e`, pressing `k` as many times as needed. Press `0` to put the cursor at the start of that line.

6. Press `v`. This runs your new binding, `begin-selection`, and starts highlighting text.

7. Press `$` to extend the selection to the end of the line.

8. Press Enter. This runs `copy-selection-and-cancel`, the vi table's binding for the command emacs binds to `M-w`. The highlight disappears and copy mode exits.

**Done when** `mode-keys` and `status-keys` are both `vi`, `v` in `copy-mode-vi` runs `begin-selection`, and the most recent paste buffer holds the deploy key line.

## What just happened

`set -g mode-keys vi` and `set -g status-keys vi` are ordinary `set-option` commands, but changing them redirects every future copy mode and every future command prompt to the vi key tables. Sourcing `~/.tmux.conf` applied them to the running server, exactly like Level 4, Task 2: writing the file alone does nothing until something reads it.

`bind -T copy-mode-vi v send -X begin-selection` added a fourth binding to that table, next to the ones already there. tmux does not care which key table a binding comes from when you press the key; it looks up whatever table copy mode is currently using, which is `copy-mode-vi` now that `mode-keys` is `vi`. Pressing `v` ran `begin-selection`, the same command `C-Space` runs in the emacs table from Level 3, Task 1, and `$` and `Enter` ran `end-of-line` and `copy-selection-and-cancel` from the vi column of the same table.

The most common mistake here is editing `~/.tmux.conf` and expecting the change to apply on its own; tmux only reads the file when it starts or when told to with `source-file`. The other is reaching for `C-Space` out of habit: in the vi table that key still exists, but `Space` alone also begins a selection, and `C-Space` is not the binding you just added.

## Go further

- Setting `VISUAL=vi` or `EDITOR=vi` in your shell before the tmux server first starts sets both `mode-keys` and `status-keys` to `vi` automatically, with no configuration file needed.
- `tmux lsk -T copy-mode-vi` lists the whole vi table; compare it against `tmux lsk -T copy-mode` to see every emacs key next to its vi equivalent.
- The manual page's copy mode command table lists every `-X` command, including ones with no default binding in either table, such as `copy-pipe`.
