---
title: "Add and remove key bindings"
slug: "key-bindings"
summary: "Bind a key to jump to window 10, bind two keys to split panes, bind a key that skips the prefix, then remove a binding."
seoDescription: 'Add tmux key bindings with bind-key, including one that needs no prefix with bind -n, list what you have, and take one away with unbind.'
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
objective: "A key selected window 10 and was unbound; `|` and `-` split; `M-n` switches windows with no prefix."
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
  - "`-n` means no prefix. Leave it off `|` and `-`, or they fire on every keystroke."
  - "`bind M-0 selectw -t:=10` at the prompt, then press `C-b M-0` to use it."
  - "Put the three `bind` lines in `~/.tmux.conf` with `open ~/.tmux.conf`, then `:source ~/.tmux.conf`. Finish with `:unbind M-0`."
---

## Concept

Four commands run the whole key system:

- `bind key command` — add a binding you press *after* `C-b`
- `bind -n key command` — add one that needs no prefix at all
- `unbind key` — remove a binding
- `list-keys -T prefix key` — show what a key currently does

Bindings live in **key tables**, and the table decides when a key applies:

- `prefix` — keys pressed after `C-b`; where `bind` writes by default
- `root` — keys with no prefix; `-n` is short for `-T root`
- `copy-mode` / `copy-mode-vi` — only inside copy mode

**`bind` replaces whatever the key did before, silently.** And a careless `-n` binding fires on every keystroke, so leave it off unless you mean it.

## Exact window targets

In `-t :=10`, the `:` says the target is a window and the `=` demands an exact match on index 10 — without it, `10` would also match a window whose name merely starts that way.

In the configuration file `|` needs no quoting; only the shell treats it specially.

## Do this

1. Press `C-b :`, type `bind M-0 selectw -t:=10`, Enter, then press `C-b M-0`.

   Window 10, `far`, is current.

2. Run `open ~/.tmux.conf`, add these lines, and save with Ctrl-S:

   ```text
   bind | split-window -h
   bind - split-window -v
   bind -n M-n next-window
   ```

3. Press `C-b :`, type `source ~/.tmux.conf`, Enter.

   `C-b |` now splits left and right; plain `M-n` changes window with no prefix.

4. Press `C-b :`, type `unbind M-0`, Enter.

   `list-keys -T prefix M-0` now reports an unknown key.

## What just happened

Each `bind` wrote into the `prefix` table, so the keys needed `C-b` first; `-n` wrote `M-n` into `root`, so it needs nothing. `unbind` deleted the window-10 binding outright, where another `bind` would only have replaced it.

## Go further

- `list-keys` with no table lists everything; `-N` shows the help text `C-b ?` uses.
- `bind t clock-mode` is its own default; binding over it shows how silently a bind replaces.
- `list-keys -T root` after any new `-n` binding is the way to catch one that fires on every keystroke.
