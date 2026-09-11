---
title: "Browse in tree mode"
slug: "tree-mode"
summary: "Open the tree of sessions, windows and panes, switch to another session, then pick a specific window from the expanded tree."
seoDescription: 'Browse every tmux session, window and pane in tree mode: C-b s and C-b w open it, arrows expand and collapse, Enter switches to your pick.'
level: 2
task: 9
difficulty: intermediate
estimatedMinutes: 3
concepts: [tree-mode, choose-tree, preview, modes]
keys:
  - key: "C-b s"
    command: "choose-tree -s"
    description: "Tree mode starting with sessions; the attached session is selected"
  - key: "C-b w"
    command: "choose-tree -w"
    description: "Tree mode with windows shown and the current window selected"
  - key: "Enter"
    command: "(tree mode) choose; Up and Down move, Right and Left expand or collapse, q exits"
    description: "Choose the selected session, window or pane; keys in tree mode need no prefix"
wikiSections: ["Choosing sessions, windows and panes", "Sessions, windows and panes"]
challenge: false
objective: "Attached to `deploy` by tree, then to `build` with window `output` current."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-window -d -t learn -n notes"
  - "tmux new-session -d -s build -n make -x 120 -y 36"
  - "tmux new-window -d -t build -n output"
  - "tmux new-session -d -s deploy -n ssh -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: tree-mode-opened
    description: "Tree mode is open in the active pane of session learn"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_mode}'"
    expect: "^tree-mode$"
  - id: attached-to-deploy
    description: "The terminal is now attached to session deploy"
    kind: tmux
    command: "list-clients -F '#{client_session}'"
    expect: "^deploy$"
  - id: build-window-output
    description: "Window output (index 1) is current in session build"
    kind: tmux
    command: "display-message -p -t build '#{window_index}'"
    expect: "^1$"
  - id: attached-to-build
    description: "The terminal is now attached to session build"
    kind: tmux
    command: "list-clients -F '#{client_session}'"
    expect: "^build$"
hints:
  - "Pressing Enter on a session line attaches to whichever window it already had current. Expand the session with `Right` and choose the window line."
  - "`C-b s` lists sessions; `C-b w` lists windows too. Inside, `Up`, `Down`, `Right`, `Left`, `Enter` and `q` need no prefix."
  - "`C-b s`, `Down` to `deploy`, Enter. Then `C-b w`, move to `output` under `build`, Enter."
---

## Concept

Two keys open the same tree at different depths:

- `C-b s` — sessions
- `C-b w` — sessions with their windows shown

Inside, no prefix is needed:

- `Up` / `Down` — move
- `Right` / `Left` — expand or collapse
- `Enter` — choose
- `q` — leave

The top half is the tree, the bottom a preview of the selected item's panes. **What you choose decides where you land:** a session line attaches you to whichever window it already had current, while a window line makes that window current *and* attaches you there.

## Tree mode is a temporary mode

Tree mode is one of tmux's modes, like the view mode behind `C-b ?`: the pane's keys are borrowed until you leave.

## Do this

1. Press `C-b s`, then `Down` twice to `deploy`, then Enter.

   The status line reads `[deploy]`.

2. Press `C-b w`, move to `output` under `build`, then Enter.

   Every session shows its windows; the status line now reads `[build]` with `output` current.

## What just happened

`C-b s` runs `choose-tree -s`, `C-b w` runs `choose-tree -w`; same mode, different starting view. Enter on a session runs the equivalent of `attach-session`, and on a window `select-window`, then closes the mode.

## Go further

- Each line shows a shortcut in brackets, `0` to `9` then `M-a` on; pressing it chooses that item at once.
- `O` cycles the sort order; `<` and `>` scroll a wide preview.
