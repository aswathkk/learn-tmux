---
title: "Tag and kill from the tree"
slug: "tag-and-kill-from-tree"
summary: "Tag several windows and sessions in tree mode and kill them together."
seoDescription: 'Tag several tmux windows and sessions in tree mode with t, then kill all of them at once with X, or run one command against every tag.'
level: 2
task: 10
difficulty: intermediate
estimatedMinutes: 3
concepts: [tree-mode, tagging, bulk-kill]
keys:
  - key: "t"
    command: "(tree mode) tag or untag the selected item; T untags all, C-t tags all"
    description: "Tagged items show bold with a *"
  - key: "X"
    command: "(tree mode) kill tagged items; x kills only the selected item"
    description: "Kill every tagged session, window or pane after confirming"
  - key: ":"
    command: "(tree mode) command prompt for the selected or each tagged item"
    description: "Run a command such as kill-session on every tagged item"
wikiSections: ["Choosing sessions, windows and panes", "Killing a session, window or pane"]
challenge: false
objective: "`learn` keeps only `shell` and `logs`, and is the only session left."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-window -d -t learn -n scratch1"
  - "tmux new-window -d -t learn -n logs"
  - "tmux new-window -d -t learn -n scratch2"
  - "tmux new-session -d -s junk1 -x 120 -y 36"
  - "tmux new-session -d -s junk2 -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: scratch-windows-gone
    description: "Window 0 of learn is shell and window 1 is logs, scratch1 and scratch2 are gone"
    kind: tmux
    command: "list-windows -t learn -F '#{window_name}'"
    expect: "^shell\\nlogs$"
  - id: junk-sessions-gone
    description: "Only the session learn remains on the server"
    kind: shell
    command: "tmux ls -F '#{session_name}' | tr '\\n' ','"
    expect: "^learn,$"
hints:
  - "Do not tag `learn` itself: killing the session you are attached to detaches you."
  - "In the tree, `t` tags the selected item, `X` kills every tagged item after a confirmation. `:` runs a command once per tagged item."
  - "`C-b w`: tag `scratch1` and `scratch2` with `t`, press `X`, `y`. Then `C-b s`: tag `junk1` and `junk2`, press `:`, type `kill-session`, Enter."
---

## Concept

Tree mode can act on many items at once. Five keys, none needing a prefix:

- `t` — tag or untag the selected item; tagged lines go bold with a `*`
- `T` / `C-t` — clear every tag / tag everything listed
- `X` — kill every tagged item, after one confirmation
- `x` — kill only the selected item, whatever is tagged
- `:` — a prompt that runs your command once per tagged item

`X` picks its command from the level you tagged: `kill-window` for windows, `kill-pane` for panes. There is no key for `kill-session`, which is why sessions go through the `:` prompt instead.

## Do this

1. Press `C-b w`, move to `scratch1` and press `t`, then move to `scratch2` and press `t`.

   Both lines turn bold.

2. Press `X`, then `y`.

   Both windows close; `shell` and `logs` remain.

3. Press `C-b s`, then tag `junk1` and `junk2` with `t`.

   Do not tag `learn` — killing the session you are attached to detaches you.

4. Press `:`, type `kill-session`, Enter.

   Both sessions close and you stay on `learn`.

## What just happened

Tagging then `X` ran one confirmed `kill-window` over the whole batch instead of two `C-b &` prompts. The `:` prompt inside tree mode differs from `C-b :`: with tags set, the command runs once per tagged item, each as its target.

## Go further

- `C-t` then untagging one item with `t` is the fast way to keep only that one.
- The confirmation before `X` is the same `confirm-before` behind `C-b &` and `C-b x`.
