---
title: "Challenge: tidy a messy session"
slug: "challenge-tidy-a-messy-session"
summary: "Rename, rearrange, kill and detach until a cluttered session becomes a clean two-window project layout."
seoDescription: 'A tmux challenge: rename, move, zoom, kill and detach until a cluttered session is a clean two-window project layout. Graded as you type.'
level: 2
task: 12
difficulty: intermediate
estimatedMinutes: 10
concepts: [rename, layout, kill, move-window, detach-client, zoom]
keys: []
wikiSections: ["Renaming sessions and windows", "Window layouts", "Killing a session, window or pane", "Swapping and moving", "Detaching other clients", "Resizing and zooming panes"]
challenge: true
objective: "Session `project`: `0:editor` with four panes in main-vertical, unzoomed; `1:logs` on `tail`; the stray client on `old` detached."
setup:
  - "tmux new-session -d -s messy -n sh -x 120 -y 36"
  - "tmux split-window -h -t messy:0"
  - "tmux split-window -v -t messy:0"
  - "tmux split-window -v -t messy:0.0"
  - "tmux resize-pane -Z -t messy:0.0"
  - "tmux new-window -d -t messy:1 -n sh"
  - "tmux new-window -d -t messy:3 'tail -f /dev/null'"
  - "tmux new-session -d -s old -x 120 -y 36"
  - "tmux new-window -d -t messy:7 -n stray 'TMUX= tmux attach -t old'"
  - "tmux select-window -t messy:0"
startCommand: "tmux attach -t messy"
checks:
  - id: session-renamed
    description: "The session messy has been renamed to project"
    kind: tmux
    command: "display-message -p -t project '#{session_name}'"
    expect: "^project$"
  - id: window-0-unzoomed
    description: "Window 0 is named editor and is not zoomed"
    kind: tmux
    command: "display-message -p -t project:0 '#{window_name}:#{window_zoomed_flag}'"
    expect: "^editor:0$"
  - id: main-vertical-layout
    description: "Window 0 has four panes arranged as main-vertical"
    kind: tmux
    command: "display-message -p -t project:0 '#{window_layout}'"
    expect: "^\\w+,\\d+x\\d+,0,0\\{\\d+x\\d+,0,0,\\d+,\\d+x\\d+,\\d+,0\\[[^\\[\\]]*\\]\\}$"
  - id: old-client-detached
    description: "No client is attached to session old any more"
    kind: tmux
    command: "display-message -p -t old '#{session_attached}'"
    expect: "^0$"
  - id: two-clean-windows
    description: "Session project has exactly two windows, 0:editor and 1:logs"
    kind: tmux
    command: "list-windows -t project -F '#{window_index}:#{window_name}:#{pane_current_command}'"
    expect: "^0:editor:sh\\n1:logs:tail$"
hints:
  - "Read the status line first: session name, a `Z` flag, window names and index gaps. Fix one thing at a time."
  - "`C-b z` unzooms. `C-b $` and `C-b ,` rename. `C-b :` then `select-layout main-vertical` reflows the panes."
  - "Switch to the empty window and `C-b &`. `C-b D`, pick the other client, `d`. Then `C-b :` `movew -r` to close the gaps."
  - "Full sequence: `C-b z`; `C-b $` project; `C-b ,` editor; `:select-layout main-vertical`; empty window `C-b &`; tail window `C-b ,` logs; `C-b D` `d`; `:movew -r`."
---

## Concept

Every fix reuses a command from this level: `C-b z` unzooms, `C-b $` and `C-b ,` rename, `select-layout` reflows, `C-b &` kills a window, `C-b D` drops a client, `movew -r` closes gaps. The new part is reading the mess off the status line before touching it.

The status line tells you almost everything: `Z` after a window name means zoomed, the window list shows names and index gaps, and `C-b D` lists every client on the server, not just yours.

## Do this

Starting from `messy`, reach this state:

1. Session renamed to `project`.
2. Window 0 named `editor`, unzoomed, four panes in `main-vertical`.
3. The empty window killed.
4. The window running `tail` named `logs`.
5. The client attached to session `old` detached.
6. Windows renumbered so only `0:editor` and `1:logs` remain.

## What just happened

Nothing running was touched; only how the server organises it changed. Renames relabel, `select-layout` recomputes sizes, `kill-window` removed a window nothing needed, detaching the client left session `old` intact but unwatched, and `move-window -r` renumbered what was left.

## Go further

- `detach-client -a` drops every other client at once when you know you want them all gone.
- `tmux list-windows -t project` from another terminal checks your work without attaching.
