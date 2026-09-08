---
title: "Browse in tree mode"
slug: "tree-mode"
summary: "Open the tree of sessions, windows and panes, switch to another session, then pick a specific window from the expanded tree."
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
objective: "Switch to session deploy with C-b s, then to window 1 of session build with C-b w."
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
  - "Press `C-b s` to see every session in a tree. Move to `deploy` with `Down`, then press `Enter`."
  - "Tree mode keys need no prefix once you are in it: just `Up`, `Down`, `Enter`, `Right`, `Left` and `q`."
  - "Press `C-b w` for the window tree. `build` starts on window `make`; press `Right` on it to expand, move down to `output`, then press `Enter`."
  - "If `Enter` on `build` lands you on `make` instead of `output`, you chose the session line instead of the window. Expand it first with `Right`."
---

Three sessions are open: `learn`, `build` and `deploy`. Switching between them by name means remembering exact spellings, and jumping to one particular window means remembering its index too. Tree mode shows you everything at once and lets you point at what you want.

## Concept

Tree mode is a mode where sessions, windows and panes are chosen from a tree instead of typed by name. It can browse the whole server, change the attached session or current window, and (Level 2, Task 10) kill or tag several items at once.

Two keys open it. `C-b s` starts with just sessions listed, the attached session already selected. `C-b w` starts with sessions expanded so windows are shown too, the current window already selected.

The screen splits into two halves: a tree of sessions, windows and panes on top, and a preview of the panes around the cursor on the bottom. For a session the preview shows its active panes; for a window, its panes; for a pane, just that pane.

Like view mode (Level 1, Task 3), keys inside tree mode need no prefix. `Up` and `Down` move the selection. `Right` expands the selected item, so a session opens to show its windows. `Left` collapses it again. `Enter` chooses the selected item: on a session it becomes the attached session, on a window it becomes the current window, and either way tree mode exits. `q` exits without choosing anything.

## Do this

1. Press `C-b s`. The window splits: a tree of sessions on top, a preview below. `learn` is selected, since it is the attached session.

2. Press `Down` twice to move the selection down past `build` to `deploy`.

3. Press `Enter`. Tree mode exits and the status line now reads `[deploy]`: you are attached to session `deploy`.

4. Press `C-b w`. This time the tree starts expanded, showing every window under every session, with the current window of `deploy` selected.

5. Move the selection up to the line for window `make` under `build`. Press `Right` to make sure `build` is expanded (it already is, from step 4), then move `Down` one line to `output`.

6. Press `Enter`. The status line reads `[build]` and the window list shows `output` as the current window.

**Done when** you are attached to session `deploy`, then attached to session `build` with window `output` current.

## What just happened

`C-b s` runs `choose-tree -s`, opening tree mode with sessions collapsed. `C-b w` runs `choose-tree -w`, the same mode but with windows already expanded and the current window pre-selected. Both are the same underlying mode; the flags only change the starting view.

Pressing `Enter` on a line in the tree runs the equivalent of `attach-session` for a session or `select-window` for a window, then closes the mode. That is why choosing `deploy` changed the attached session, while choosing `output` under `build` changed the current window of `build` without touching which session you were attached to at that point.

A common mistake is pressing `Enter` on the session line itself instead of on one of its windows: that attaches you to whichever window was already current, not the one you wanted. Expand the session with `Right` first and move down onto the specific window line.

## Go further

- Each line in the tree shows a shortcut key in brackets: the first ten items get digits `0` to `9`, and the rest get `M-a` upward. Pressing that key chooses the item immediately, without moving the selection first.
- `O` cycles the sort order of the tree, useful when many sessions or windows are open.
- `<` and `>` scroll the preview left and right if a pane is wider than the space available.
