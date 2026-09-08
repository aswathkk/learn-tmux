---
title: "Challenge: tidy a messy session"
slug: "challenge-tidy-a-messy-session"
summary: "Rename, rearrange, kill and detach until a cluttered session becomes a clean two-window project layout."
level: 2
task: 12
difficulty: intermediate
estimatedMinutes: 10
concepts: [rename, layout, kill, move-window, detach-client, zoom]
keys: []
wikiSections: ["Renaming sessions and windows", "Window layouts", "Killing a session, window or pane", "Swapping and moving", "Detaching other clients", "Resizing and zooming panes"]
challenge: true
objective: "Turn session messy into session project with exactly two windows, 0:editor (four panes in main-vertical, not zoomed) and 1:logs running tail, with the stray client on session old detached."
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
  - "Read the status line first. It tells you the session name, which window has the Z flag, and which window is which index. Fix one thing at a time."
  - "Unzoom with `C-b z`, rename the session with `C-b $` and the windows with `C-b ,`. A layout applies from the command prompt: `C-b :` then `select-layout main-vertical`."
  - "Kill the empty window with `C-b &` after switching to it. Drop the other person's client with `C-b D`, pick their line, press `d`. Then close the gap in the window list from the prompt with `movew -r`."
  - "Full sequence: unzoom window 0, `C-b $` to project, `C-b ,` to editor, `:select-layout main-vertical`, switch to the empty window and `C-b &` to kill it, switch to the tail window and `C-b ,` to logs, `C-b D` then `d` on the other client, finally `:movew -r`."
---

Someone left this session running before a pairing session, and it shows. One pane fills the whole screen, the windows have leftover names, a window is empty, and their own terminal is still attached to another session. Straighten it out before you start work.

## Concept

Every fix here reuses a command from earlier in this level: `resize-pane -Z` to unzoom, `rename-session` and `rename-window` to relabel, `select-layout` to reflow panes, `kill-window` to remove one, `detach-client` to release someone else's terminal, and `move-window -r` to close gaps in the window list. None of it is new. What is new is reading the session's current state from the status line and formats before deciding what to run.

The status line already tells you most of what is wrong: a `Z` flag means a pane is zoomed, the window list shows names and gaps in the index numbers, and `C-b D` lists every client attached anywhere on the server, not just to your own session.

## Do this

Starting from the attached session `messy`, bring it to this end state:

- Session `messy` renamed to `project`.
- Window 0 renamed to `editor`, unzoomed, and its four panes arranged with `select-layout main-vertical`.
- The empty extra window killed.
- The window running `tail` renamed to `logs`.
- The stray client attached to session `old` detached.
- The window list renumbered so only `0:editor` and `1:logs` remain.

Work through the status line one flag at a time. `C-b z` unzooms a pane. `C-b $` and `C-b ,` rename the session and the current window. The command prompt (`C-b :`) takes `select-layout main-vertical` directly. Switch windows with `C-b <index>`, then use `C-b &` to kill the empty one. `C-b D` opens the client list from Level 2, Task 11; move to the other client's line and press `d` to detach it. Once the empty window and the stray client's window are both gone, the index list has gaps, so finish with `:movew -r` from the command prompt.

**Done when** session `project` has exactly two windows, `0:editor` with four panes in `main-vertical` and not zoomed, `1:logs` running `tail`, and the client that was attached to `old` is detached.

## What just happened

Nothing here changed a program that was running, only how the server organises it. `rename-session` and `rename-window` just relabel entries the server already tracks. `select-layout main-vertical` recomputes pane sizes from the same layout tree that `next-layout` cycles through with `C-b Space`. `kill-window` closed the whole window because nothing in it was worth keeping; `kill-pane` would only have removed the pane if you wanted to keep the window itself.

Detaching the other client did not touch session `old` at all: `old` still exists with its window intact, only its one client is gone. Finally, `move-window -r` walked the window list and renumbered every window in order, closing the gap left by the windows you killed and detached.

## Go further

- `detach-client -a` from the command prompt detaches every client except the one you are typing on, which is faster than picking one out of `C-b D` when you know you want them all gone.
- `list-windows -t project` from a plain shell (outside tmux) shows the same window list you just cleaned up, which is a fast way to check your own work from another terminal.
