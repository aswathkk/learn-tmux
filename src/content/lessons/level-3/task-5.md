---
title: "Find a window by its content or name"
slug: "find-a-window"
summary: "Search all panes for a piece of text and jump straight to the window that shows it, then find a window by name from tree mode."
seoDescription: 'Find a tmux window by what is on its screen with C-b f, or by name from tree mode with C-s, and jump to it however many windows you have.'
level: 3
task: 5
difficulty: advanced
estimatedMinutes: 4
concepts: [find-window, filter, tree-mode, search]
keys:
  - key: "C-b f"
    command: "find-window"
    description: "Prompt for text and open tree mode filtered to panes whose visible content, title or window name matches"
  - key: "C-s"
    command: "(tree mode) search by name"
    description: "Type a name and move to the first matching item in the tree"
  - key: "n"
    command: "(tree mode) repeat the last search"
    description: "Jump to the next match"
wikiSections: ["Finding windows and panes", "Choosing sessions, windows and panes"]
challenge: false
objective: "The `connection refused` window was found by filter, then `docs` by tree search."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-window -t learn -d -n build"
  - "tmux new-window -t learn -d -n api"
  - "tmux new-window -t learn -d -n cache"
  - "tmux new-window -t learn -d -n db \"sh -c 'echo \\\"db-1: connection refused (code 4471)\\\"; exec sh'\""
  - "tmux new-window -t learn -d -n docs"
startCommand: "tmux attach -t learn"
checks:
  - id: filter-opened
    description: "The current pane is showing the find-window filter in tree mode"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_mode}'"
    expect: "^tree-mode$"
  - id: db-window-current
    description: "Window 4 (db, the one that printed connection refused) is current"
    kind: tmux
    command: "display-message -p -t learn '#{window_index}'"
    expect: "^4$"
  - id: docs-window-current
    description: "Window docs is current, found by name from tree mode"
    kind: tmux
    command: "display-message -p -t learn '#{window_name}'"
    expect: "^docs$"
hints:
  - "Wait for the prompt to appear before typing; text typed early goes to the shell."
  - "`C-b f`, type `connection refused`, Enter. Then `Down` onto the matching row and Enter again."
  - "`C-b w`, then `C-s`, type `docs`, Enter to jump, Enter to select."
---

## Concept

`C-b f` asks for text and opens tree mode showing only panes whose visible content, title or window name matches. Inside any tree, `C-s` searches names and `n` jumps to the next match.

The filter reads what is on screen now, not the scrollback. When something matches, the line above the preview says `filter: active`; when nothing does, the full tree shows with `filter: no matches`.

`C-s` and `n` are ordinary tree mode keys, so they work whether or not a filter is on.

## Do this

1. Press `C-b f`, type `connection refused`, Enter. The tree shows one pane, with `filter: active`.
2. The session line is selected, not the match. Press `Down` to the `db` row below it, then Enter. `db` is current.
3. Press `C-b w`, then `C-s`, type `docs`, Enter. The selection jumps to `docs`. Press Enter. `docs` is current.

## What just happened

`C-b f` runs `find-window`, which builds a `choose-tree` filter from your text. Enter on a row does what it always does in the tree. `C-s` matched the window name, not its content, which is why it found `docs` with nothing printed in it.

## Go further

- `find-window -r` treats the text as a regular expression; `-i` ignores case; `-C`, `-N` and `-T` restrict the match to content, name or title.
- `findw docs` at the prompt is the same as `C-b f` then `docs`.
