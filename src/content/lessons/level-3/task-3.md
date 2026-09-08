---
title: "Choose and delete buffers in buffer mode"
slug: "buffer-mode"
summary: "Open the buffer list, paste an older buffer instead of the newest one, and delete a stale buffer."
level: 3
task: 3
difficulty: advanced
estimatedMinutes: 3
concepts: [buffer-mode, automatic-buffers, named-buffers]
keys:
  - key: "C-b ="
    command: "choose-buffer"
    description: "Enter buffer mode: Enter or p pastes the selected buffer, d deletes it, q exits"
  - key: "d"
    command: "(buffer mode) delete-buffer"
    description: "Delete the selected buffer without pasting it"
wikiSections: ["Copy and paste", "Choosing sessions, windows and panes"]
challenge: false
objective: "Paste the older host=db-1.internal buffer into the shell and delete the buffer named stale."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux set-buffer -b stale 'STALE-DO-NOT-USE'"
  - "tmux set-buffer 'host=db-1.internal'"
  - "tmux set-buffer 'host=web-3.internal'"
startCommand: "tmux attach -t learn"
checks:
  - id: pasted-older-buffer
    description: "The older host=db-1.internal buffer was pasted into the shell pane"
    kind: tmux
    command: "capture-pane -p -t learn:0"
    expect: "host=db-1\\.internal"
  - id: stale-buffer-deleted
    description: "No buffer named stale remains on the server"
    kind: shell
    command: "tmux list-buffers -F '#{buffer_name}' | grep -c '^stale$' || true"
    expect: "^0$"
hints:
  - "Press `C-b =` to open buffer mode. The newest buffer, `host=web-3.internal`, is at the top; the older `host=db-1.internal` is the next one down."
  - "Move to the db-1 buffer with `Down`, then press `Enter` (or `p`) to paste it. That is different from `C-b ]`, which always pastes the newest buffer."
  - "Reopen buffer mode with `C-b =`, move to the buffer named `stale`, and press `d`. That deletes only the selected buffer; `D` would delete tagged buffers instead."
  - "If you paste the wrong text into the shell, press `C-u` to clear the line, then reopen buffer mode with `C-b =` and try again."
---

Level 3, Task 2 pasted the most recent buffer with `C-b ]`. That only ever reaches the newest one. This task has three buffers on the server and the one you need is not the newest, so you need a way to see the whole list and pick.

## Concept

Every paste buffer tmux creates without a name is an automatic buffer, named `buffer0`, `buffer1`, and so on, newest last. `C-b ]` always pastes the newest automatic buffer. tmux keeps up to 50 automatic buffers; past that, the oldest is dropped as a new one is added. A buffer given a name with `set-buffer -n` is a named buffer instead, and named buffers are never dropped this way.

To reach any buffer other than the newest, use buffer mode, entered with `C-b =`. Buffer mode lists every buffer, named and automatic, with the newest at the top and a preview of its contents below. It works like the tree mode from Level 2, Tasks 9 and 10: `Up` and `Down` move the selection, no prefix needed, and `q` exits. Buffer mode adds its own keys on top of that: `Enter` or `p` pastes the selected buffer into the active pane, and `d` deletes it from the list.

## Do this

1. Press `C-b =`. The screen splits: a list of buffers on top, a preview of the selected one below.
2. Read the list top to bottom. The newest buffer, holding `host=web-3.internal`, is first. Below it is the automatic buffer holding `host=db-1.internal`, the one this task needs.
3. Press `Down` once to select the `host=db-1.internal` buffer. The preview below updates to show its text.
4. Press `Enter` to paste it into the shell pane and exit buffer mode. The text appears at the shell prompt, not yet run.
5. Press `C-b =` again to reopen buffer mode.
6. Move down to the buffer named `stale`, holding `STALE-DO-NOT-USE`.
7. Press `d`. That buffer disappears from the list immediately; buffer mode stays open.
8. Press `q` to exit buffer mode.

**Done when** the shell pane has `host=db-1.internal` pasted at the prompt and no buffer named `stale` remains on the server.

## What just happened

`C-b =` runs `choose-buffer`, tmux's buffer-mode command, the same way `C-b s` runs `choose-tree -s`. Selecting a row and pressing `Enter` or `p` runs `paste-buffer` against that specific buffer instead of the newest one, which is what makes it possible to reach `host=db-1.internal` even though `host=web-3.internal` was copied more recently and sits above it in the list.

Pressing `d` on the `stale` row ran `delete-buffer` for that one buffer only. Buffer mode's capital-letter counterpart, `D`, deletes every tagged buffer at once, the same tag-then-act pattern tree mode uses with `t` and `X`; a single untagged buffer only needs the lowercase key.

Named buffers like `stale` exist alongside the automatic `bufferN` ones and do not get pushed out as new automatic buffers are created. That is why the list can hold an old named buffer next to two fresh automatic ones, and why deleting it takes an explicit `d` rather than waiting for it to age out.

## Go further

- `set-buffer -b name -n newname` renames an existing buffer from the command prompt, turning an automatic buffer into a named one.
- `save-buffer -b name path` writes a buffer's contents to a file. Level 3, Task 4 covers this and `load-buffer`.
- From the command prompt, `:show-buffer -b name` prints a buffer's full contents without opening buffer mode.
