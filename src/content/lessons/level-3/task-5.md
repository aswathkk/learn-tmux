---
title: "Find a window by its content or name"
slug: "find-a-window"
summary: "Search all panes for a piece of text and jump straight to the window that shows it, then find a window by name from tree mode."
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
objective: "Find the window whose pane printed connection refused and make it current, then use tree-mode search to make the window named docs current."
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
  - "`C-b f` prompts for text, the same way `C-b ,` or `C-b $` do. Type the text, then press Enter."
  - "One pane printed `connection refused`. Search for that text, then press Enter on the matching row to make its window current."
  - "For the second part, open tree mode with `C-b w`, then press `C-s` and type `docs`. Press Enter to jump to it, then Enter again to select it."
  - "Common mistake: typing the search text before the prompt has appeared. Wait for the bottom-left prompt before typing."
---

Six windows are open and one of them printed an error a while ago. Scrolling through each one to find it would waste time. `C-b f` searches every pane at once.

## Concept

`find-window` prompts for text, then opens tree mode with a filter applied. The filter checks three things for each pane: its visible content (what is on screen right now, not the scrollback history), its pane title, and the name of the window it belongs to.

If the text matches at least one pane, only the matching panes appear in the tree, and the line above the preview reads `filter: active`. If nothing matches, tree mode shows everything and the line reads `filter: no matches` instead, so you always know whether the search found something.

Tree mode itself, from Level 2, Task 9, splits the window into a tree on top and a preview below. `C-b w` opens it with sessions expanded to windows, the current window selected. Beyond the movement keys you already know, tree mode has its own search: `C-s` prompts for a name and jumps to the first item whose name contains it, and `n` repeats the search to jump to the next match. These two keys work in any tree-mode view, filtered or not, so the same search finds a window by name once you already know what it is called.

## Do this

1. Press `C-b f`. A prompt appears at the bottom left asking for text.
2. Type `connection refused` and press Enter. Tree mode opens showing only the pane that matched, with `filter: active` above the preview.
3. Press `Enter` on the matching row. tmux switches to that window and exits tree mode.
4. Press `C-b w` to open tree mode again, this time unfiltered and starting on the window you just switched to.
5. Press `C-s`. A prompt for a name appears.
6. Type `docs` and press Enter. The selection jumps to the window named `docs`.
7. Press `Enter` again to make it current and exit tree mode.

**Done when** the window that printed `connection refused` was made current by a filtered search, then the window named `docs` was made current by a tree-mode name search.

## What just happened

`C-b f` runs `find-window`, which asks for `match-string` at the command prompt and then opens `choose-tree` with a filter built from it. Because the filter only reads visible content, not scrollback, only text currently on screen can be found this way; a message that has scrolled off the top of a pane will not match.

Selecting a row and pressing `Enter` runs the same action as it does anywhere else in tree mode: it changes the current window (or attached session, or active pane) to the chosen item and exits the mode, exactly as in Level 2, Task 9.

`C-s` and `n` are plain tree-mode keys, listed without a prefix in the same key table as `Up`, `Down`, `t` and `q`. They search the names shown in the tree rather than pane content, so they work whether or not a filter from `find-window` is active. Typing `docs` and pressing Enter moved the selection to the first window whose name contains that text; pressing `n` again would move to the next one if there were more than one match.

## Go further

- `find-window` takes flags at the command prompt: `-i` for an exact match, `-r` to treat the text as a regular expression, `-C` to also search pane content in the scrollback rather than just what is visible.
- The command-prompt form is `find-window text`, so `:findw docs` (its alias) works the same as pressing `C-b f` and typing `docs`.
