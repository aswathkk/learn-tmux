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
objective: "`host=db-1.internal` is pasted at the prompt and buffer `stale` is deleted."
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
  - "`C-b ]` only ever pastes the newest buffer. Buffer mode, `C-b =`, lets you pick any."
  - "Newest is at the top. `Down` once selects `host=db-1.internal`; Enter pastes it."
  - "Reopen with `C-b =`, move to `stale`, press `d` to delete it, `q` to leave. Pasted the wrong thing? `C-u` clears the shell line."
---

## Concept

`C-b =` opens buffer mode: every paste buffer, newest first, with a preview. `Up` and `Down` move, Enter (or `p`) pastes the selected buffer, `d` deletes it, `q` leaves. It is how you reach a buffer other than the newest.

Buffers copied without a name are automatic, `buffer0`, `buffer1`, and the oldest is dropped past 50. A named buffer, made with `set-buffer -b name`, is never dropped that way, so a stale one sits in the list until you delete it.

Buffer mode uses the same keys as tree mode; `D` deletes tagged buffers, as `X` kills tagged windows there.

## Do this

1. Press `C-b =`. The newest buffer, `host=web-3.internal`, is at the top.
2. Press `Down` to select `host=db-1.internal`, then Enter. It appears at the shell prompt, not run.
3. Press `C-b =` again, move to `stale`, press `d`. It vanishes from the list. Press `q`.

## What just happened

`C-b =` runs `choose-buffer`. Enter runs `paste-buffer` on the selected buffer instead of the newest; `d` runs `delete-buffer` on it. That is the only way a named buffer leaves the list, since it never ages out.

## Go further

- `set-buffer -b name -n newname` renames a buffer from the prompt.
- `show-buffer -b name` prints a buffer's whole contents.
- `save-buffer` and `load-buffer` move buffers to and from files.
