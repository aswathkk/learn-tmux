---
title: "Tag and kill from the tree"
slug: "tag-and-kill-from-tree"
summary: "Tag several windows and sessions in tree mode and kill them together."
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
objective: "Kill the windows scratch1 and scratch2 of learn from C-b w, then the sessions junk1 and junk2 from C-b s, leaving only learn with shell and logs."
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
  - "Open `C-b w`, move to `scratch1`, press `t` to tag it, move to `scratch2`, press `t` again, then press `X` and confirm."
  - "Tagged items are bold with a `*` after the name. `X` kills every tagged item at once, not just the one under the cursor."
  - "For the sessions, open `C-b s`, tag `junk1` and `junk2` with `t`, then press `:` and type `kill-session` followed by Enter."
  - "Do not tag `learn` itself: killing the session you are attached to detaches your client."
---

Killing panes and windows one at a time with `C-b x` and `C-b &` is fine for one item. Tree mode can do several at once: tag what you want gone, then kill or command them together.

## Concept

Tree mode, opened with `C-b w` or `C-b s` (Level 2, Task 9), lists sessions, windows and panes without needing the prefix key for its own controls. Beyond `Enter`, `Right` and `Left`, it has a tagging system built for bulk operations.

Pressing `t` tags the item under the cursor; pressing `t` again untags it. A tagged item is drawn bold with a `*` after its name. `T` clears every tag, and `C-t` tags everything currently listed. Tags stick as you move the cursor with `Up` and `Down`, so you can walk down a list tagging several items in a row.

Two keys act on the tagged set. `X` kills every tagged item after asking for confirmation; `x` still kills only the single selected item, tags or no tags. `:` opens a command prompt and runs whatever you type once for the selected item, or once for each tagged item if any are tagged. This is how the wiki reaches `kill-session`: tree mode has no dedicated key for it, so you tag the sessions and run it from the `:` prompt.

## Do this

1. From the attached session `learn`, open `C-b w`. The tree shows `learn` expanded, its four windows listed below it.
2. Move the cursor to `scratch1` with `Down` and press `t`. Its line turns bold with a `*`.
3. Move to `scratch2` and press `t` as well. Two windows are now tagged; `shell` and `logs` are not.
4. Press `X`. tmux asks for confirmation. Confirm with `y`. Both tagged windows close and you land back in `learn` with `shell` and `logs` left.
5. Open `C-b s`. The tree lists sessions: `junk1`, `junk2` and `learn`, collapsed.
6. Tag `junk1` and `junk2` with `t` on each. Do not tag `learn`.
7. Press `:`. A prompt opens at the bottom for the tagged items. Type `kill-session` and press Enter. Both junk sessions close; you stay attached to `learn`.

**Done when** window 0 of `learn` is `shell` and window 1 is `logs` with no scratch windows, and `learn` is the only session left on the server.

## What just happened

`t` and `X` in tree mode are shorthand for tagging then running `kill-window` or `kill-pane` on every tagged entry, whichever level of the tree you tagged at. Confirming once covers the whole batch, so two windows closed together instead of two separate `C-b &` prompts.

The `:` prompt in tree mode is different from the ordinary `C-b :` command prompt (Level 1, Task 4): here, if any items are tagged, the command you type runs once per tagged item instead of once. `kill-session` has no key binding anywhere in tmux, so tagging the sessions and typing it at this prompt is the only way to kill several sessions from the tree at once.

Tagging `learn` itself would have been a mistake: `kill-session` kills the attached session and detaches the client running it, so killing your own session from inside it ends your terminal's view of tmux entirely. That is worse than `C-b &` on a single window (Level 2, Task 3), which only ever closes what you are looking at.

## Go further

- `C-t` tags every item currently listed, useful for "keep only this one" by tagging all then untagging the exception with `t`.
- `T` clears all tags without leaving tree mode, if you tagged the wrong things.
- The confirmation before `X` is the same `confirm-before` wrapper used by `C-b &` and `C-b x`.
