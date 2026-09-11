---
title: "Rename the session and a window"
slug: "rename-session-and-window"
summary: "Give the default session 0 and its window meaningful names using the rename prompts."
seoDescription: 'Rename a tmux session with C-b $ and a window with C-b , so the status line says what you are working on instead of 0:sh and 0:bash.'
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
objective: "Session `0` is named `project` and its window 0 is named `editor`."
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
  - "The prompt opens with the old name already in it. Clear it with `C-u` before typing the new one."
  - "`C-b $` renames the session; `C-b ,` renames the current window."
  - "`C-b $`, `C-u`, `project`, Enter. Then `C-b ,`, `C-u`, `editor`, Enter."
---

## Concept

One key per level:

- `C-b $` — rename the session
- `C-b ,` — rename the current window

Both open a prompt with the **old name already in it**. Clear it with `C-u` first, then type the new name and press Enter.

Windows are renamed automatically after the program running in them, which is why a new window is `sh` and becomes `top` when you run `top`. Naming a window yourself — with `-n` or `C-b ,` — switches that off for that window, and the name sticks.

## A name is only a label

A name is only a label. The window keeps its index and is still addressed by index, and two windows may even share a name.

## Do this

1. Press `C-b $`, then `C-u`, type `project`, Enter.

   The prompt opened showing `0`; the status line now reads `[project]`.

2. Press `C-b ,`, then `C-u`, type `editor`, Enter.

   The prompt opened showing `sh`; the list now reads `0:editor*`.

## What just happened

`C-b $` runs `rename-session` on the attached session and `C-b ,` runs `rename-window` on the current window, so neither needs a target. Renaming the window also turned `automatic-rename` off for it: it will keep `editor` whatever runs there next.

## Go further

- `rename-window -t 1 logs` renames a window you are not on.
- `set -wg automatic-rename off` stops automatic renaming for every window.
