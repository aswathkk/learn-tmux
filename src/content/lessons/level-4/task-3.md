---
title: "Add and remove key bindings"
slug: "key-bindings"
summary: "Bind a key to jump to window 10, bind two keys to split panes, bind a key that skips the prefix, then remove a binding."
level: 4
task: 3
difficulty: expert
estimatedMinutes: 5
concepts: [key-tables, bind-key, unbind-key, list-keys]
keys:
  - key: ":bind M-0 selectw -t:=10"
    command: "bind-key (prefix table by default; -T names a table)"
    description: "Bind a key to a command; bind replaces an existing binding silently"
  - key: ":bind -n M-n next-window"
    command: "bind-key -n (same as -T root)"
    description: "Bind a key that works without the prefix"
  - key: ":unbind M-0"
    command: "unbind-key"
    description: "Remove a binding completely"
wikiSections: ["Key bindings", "Help keys", "Changing the current window"]
challenge: false
objective: "Bind a prefix key that selects window 10 and press it, bind | to split left/right and - to split top/bottom, bind M-n in the root table to next-window, then unbind the window-10 key."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-window -d -t learn:10 -n far"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
startCommand: "tmux attach -t learn"
checks:
  - id: window-10-bound
    description: "Some key in the prefix table selects window 10"
    kind: tmux
    command: "list-keys -T prefix"
    expect: "select-window -t :=10"
  - id: window-10-reached
    description: "Window 10 is now the current window of session learn"
    kind: tmux
    command: "display-message -p -t learn '#{window_index}'"
    expect: "^10$"
  - id: pipe-splits-h
    description: "The | key in the prefix table splits the window left/right"
    kind: tmux
    command: "list-keys -T prefix '|'"
    expect: "split-window -h"
  - id: dash-splits-v
    description: "The - key in the prefix table splits the window top/bottom"
    kind: tmux
    command: "list-keys -T prefix -"
    expect: "split-window -v"
  - id: root-m-n-bound
    description: "M-n in the root table runs next-window"
    kind: tmux
    command: "list-keys -T root M-n"
    expect: "next-window"
  - id: m-0-unbound
    description: "M-0 no longer has a binding in the prefix table"
    kind: shell
    command: "tmux list-keys -T prefix M-0 >/dev/null 2>&1 && echo bound || echo unbound"
    expect: "^unbound$"
hints:
  - "Every key binding lives in a key table. Open the command prompt with `C-b :` and run `bind-key` to add one."
  - "The command is `bind M-0 selectw -t:=10`. Type it at the prompt, press Enter, then press `C-b M-0` to try it."
  - "For a key that works without the prefix, add `-n` to `bind-key`. Put the `|`, `-` and `M-n` bindings in `~/.tmux.conf` and load it with `:source ~/.tmux.conf`, same as Level 4, Task 2."
  - "To remove the window-10 binding completely, run `unbind M-0` at the command prompt. `list-keys -T prefix` should no longer mention it."
---

`C-b c`, `C-b z` and every other key you have pressed is a line in a key table. You can add your own, and remove any binding that gets in your way.

## Concept

A key binding maps a key to a command. tmux keeps them in four default key tables. The `root` table holds keys pressed with no prefix at all, the same table `C-b` itself is not in. The `prefix` table holds keys pressed after the prefix, which is everything you have used until now. `copy-mode` and `copy-mode-vi` hold the keys active inside copy mode.

`bind-key` adds or replaces a binding. Written with no `-T` flag it targets the `prefix` table, so `bind-key M-0 selectw -t:=10` makes `C-b M-0` run `select-window -t :=10`. The `-t` target uses `:=10`, where `:` means the target is a window and `=` means match the name or index exactly, so it jumps to window 10 and nothing else. `bind-key` needs no confirmation and silently replaces whatever was there before. The `-n` flag is shorthand for `-T root`, so `bind-key -n M-n next-window` makes plain `M-n` run `next-window` with no prefix at all.

`list-keys`, `C-b /`, is how you check a table before trusting it. `list-keys -T prefix` prints every prefix binding as a `bind-key` command; give it a single key, like `list-keys -T prefix 9`, to see just that one. `unbind-key` removes a binding outright; you only need it when a key should do nothing, since binding over an old key already replaces it.

## Do this

1. Press `C-b :` to open the command prompt. Type `bind M-0 selectw -t:=10` and press Enter. Nothing appears to change yet.
2. Press `C-b M-0`. The window list on the status line now shows window 10 as current.
3. Press `C-b :` again and run `list-keys -T prefix M-0`. It prints back the `bind-key` line you just created.
4. Open `~/.tmux.conf` with `open ~/.tmux.conf` and add three lines:

   ```text
   bind | split-window -h
   bind - split-window -v
   bind -n M-n next-window
   ```

   Save and quit. `|` needs no quoting here because the configuration file, unlike the shell, does not treat it specially.
5. Press `C-b :`, run `source ~/.tmux.conf`, and press Enter. The three new bindings are now live in the running server, same as Level 4, Task 2.
6. Press `C-b :` once more and run `unbind M-0`. Run `list-keys -T prefix M-0` again: it now reports an unknown key, because the binding is gone.

**Done when** a prefix key selects window 10 and you have pressed it, `|` and `-` split the window, `M-n` changes windows with no prefix, and the window-10 key no longer has a binding.

## What just happened

Step 1 ran `bind-key`, which by default writes into the `prefix` table, so the new key needed `C-b` first, same as every default binding. `select-window -t :=10` is the same command the wiki shows behind `C-b 9`, just aimed at window 10 instead. Step 4 put two more `bind-key` commands and one `bind-key -n` command into the configuration file. `-n` is shorthand for `-T root`, tmux's table for keys with no prefix, so `M-n` alone now runs `next-window`, the command behind `C-b n`.

Step 6 used `unbind-key` to delete the window-10 binding entirely. `bind-key` alone would have been enough to change it to something else, since a new `bind-key` silently overwrites whatever key it names; `unbind-key` is for when you want the key to do nothing at all afterward.

## Go further

- `list-keys` with no `-T` lists every table at once; `list-keys -N` shows the short help text instead of the raw commands, the same text `C-b ?` shows.
- Binding over `C-b t` (`bind t clock-mode`, its own default) shows the replace-on-bind behaviour without adding anything new; `unbind t` then removes clock mode from the prefix table until you bind it again.
- A common mistake is adding `-n` when you meant a prefix binding, which then fires on every keystroke in every pane. Check `list-keys -T root` after any new binding that should still need `C-b`.
