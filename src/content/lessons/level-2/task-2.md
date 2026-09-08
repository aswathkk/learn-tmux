---
title: "Rename the session and a window"
slug: "rename-session-and-window"
summary: "Give the default session 0 and its window meaningful names using the rename prompts."
level: 2
task: 2
difficulty: intermediate
estimatedMinutes: 3
concepts: [rename, session-name, window-name, automatic-rename]
keys:
  - key: "C-b $"
    command: "rename-session"
    description: "Prompt for a new name for the attached session"
  - key: "C-b ,"
    command: "rename-window"
    description: "Prompt for a new name for the current window"
wikiSections: ["Renaming sessions and windows", "The status line"]
challenge: false
objective: "Rename session 0 to project and its window 0 to editor."
setup:
  - "tmux new-session -d -x 120 -y 36"
startCommand: "tmux attach -t 0"
checks:
  - id: session-renamed
    description: "Session 0 has been renamed to project"
    kind: tmux
    command: "display-message -p -t project '#{session_name}'"
    expect: "^project$"
  - id: window-renamed
    description: "Window 0 of session project has been renamed to editor"
    kind: tmux
    command: "display-message -p -t project:0 '#{window_name}'"
    expect: "^editor$"
hints:
  - "The rename keys are `C-b $` for the session and `C-b ,` for the window. Release Ctrl before pressing the second key."
  - "Press `C-b $`, clear the prefilled name, type `project`, and press Enter."
  - "Then press `C-b ,`, clear the prefilled name with `C-u`, type `editor`, and press Enter."
---

tmux names a new session with a plain number and its first window after whatever program runs in it. That says nothing about the project once more than one session is open. `rename-session` and `rename-window` fix this from a prompt, without closing or restarting anything.

## Concept

A session gets its name from `-s` at creation, or a plain number if you leave that out, as in Level 1, Task 1. A window's name works the same way: whatever you pass to `-n`, or the name of the program running in its active pane if you do not. Both can be changed later, and both changes happen through the command prompt rather than a flag.

`C-b $` opens the prompt to run `rename-session`, renaming the session the client is attached to. `C-b ,` does the same for `rename-window`, renaming the current window. Neither prompt starts blank: it is filled in with the name you are replacing, so you edit it rather than type from scratch.

A name is a label, not an identity. A window keeps its index, `0`, `1`, and so on, after it is renamed, and windows are still normally identified by session and index, the way `C-b 0` through `C-b 9` select them. Two windows can even share a name; only the index inside a session has to stay unique.

A window's name can also change on its own. tmux calls a setting like this an option, and the one behind this is `automatic-rename`, on by default: it keeps renaming a window to match the program running in its active pane, which is why a fresh window is called `sh` and switches to `top` the moment you run `top` in it. Naming a window yourself, with `-n` at creation or with `rename-window` later, turns `automatic-rename` off for that one window. It keeps the name you gave it no matter what runs there next.

## Do this

1. Look at the status line. It reads `[0]` on the left, and the window list reads `0:sh*`: session `0`, its only window named after the shell running in it.
2. Press `C-b $`. The prompt replaces the status line, showing `0`, the session's current name.
3. Clear it with `C-u`, type `project`, and press Enter. The left end of the status line now reads `[project]`.
4. Press `C-b ,`. The prompt reappears, this time showing `sh`, the window's current name.
5. Clear it with `C-u`, type `editor`, and press Enter. The window list now reads `0:editor*`.

**Done when** the status line reads `[project]` and the window list shows `0:editor*`.

## What just happened

`C-b $` runs `rename-session`, which renames the session your client is attached to; it needs no target because that session is implied. `C-b ,` runs `rename-window`, which renames the current window in that session. Both keys open the command prompt with the existing name already there, which is why `C-u`, delete the entire command at the prompt, was the fast way to clear it before typing the replacement.

Renaming window 0 to `editor` also turned `automatic-rename` off for that window. Until now tmux was free to relabel it after whatever program ran there; from here it will not, even once you start another program in it. The session and window still sit at the same place in the model, session `project`, window index `0`. Only the label changed.

## Go further

- Both commands can target a session or window without your having to visit it: `:rename-window -t 1 logs` renames window 1 to `logs` from wherever you currently are.
- `rename-session` has the alias `rename`, so `:rename project` does the same thing once you are attached to that session.
- To stop tmux renaming windows automatically everywhere, not just this one, run `set-option -wg automatic-rename off`.
