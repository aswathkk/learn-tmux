---
title: "Challenge: recover the secret from the logs"
slug: "challenge-recover-the-secret"
summary: "Find the crashed worker, copy its token from deep scrollback, save it as a named buffer and a file, then paste it into your shell."
level: 3
task: 10
difficulty: advanced
estimatedMinutes: 10
concepts: [find-window, copy-mode, search, named-buffers, save-buffer, paste, mouse]
keys: []
wikiSections: ["Finding windows and panes", "Copy and paste", "Using the mouse"]
challenge: true
objective: "Buffer `token` holds the token, saved to `~/token.txt` and pasted into window 0, with the mouse on."
setup:
  - "seq 1 300 > /home/alpine/worker.log"
  - "echo 'FATAL auth failed token=tok-8a1f4c9e2b' >> /home/alpine/worker.log"
  - "seq 301 350 >> /home/alpine/worker.log"
  - "echo 'worker 7 crashed: see the FATAL line above' >> /home/alpine/worker.log"
  - "tmux new-session -d -s ops -n shell -x 120 -y 36"
  - "tmux new-window -d -t ops -n api \"sh -c 'seq 1 100; exec sh'\""
  - "tmux new-window -d -t ops -n worker \"sh -c 'cat ~/worker.log; exec sh'\""
  - "tmux new-window -d -t ops -n cache"
  - "tmux select-window -t ops:0"
startCommand: "tmux attach -t ops"
checks:
  - id: token-buffer-named
    description: "A buffer named token holds the tok- value"
    kind: tmux
    command: "list-buffers -F '#{buffer_name}=#{buffer_sample}'"
    expect: "^token=.*tok-8a1f4c9e2b"
  - id: token-file-saved
    description: "The buffer was saved to ~/token.txt"
    kind: shell
    command: "cat /home/alpine/token.txt"
    expect: "tok-8a1f4c9e2b"
  - id: token-pasted
    description: "The token was pasted into window 0"
    kind: tmux
    command: "capture-pane -p -t ops:0"
    expect: "tok-8a1f4c9e2b"
  - id: mouse-on
    description: "The mouse option is left enabled"
    kind: tmux
    command: "show-options -g -v mouse"
    expect: "^on$"
hints:
  - "`C-b f` searches what is on screen, not the scrollback. The crash line is visible; the token is not."
  - "In the right window, `C-b [` then `C-r` searches backward through the scrollback for text you type."
  - "After `M-w`, rename with `:setb -b buffer0 -n token`, then `:saveb -b token ~/token.txt`."
  - "`C-b 0`, `C-b ]` to paste, then `:set -g mouse on`."
---

## Concept

Nothing new. `C-b f` finds the window, `C-b [` and `C-r` find the line in its history, `C-Space` and `M-w` copy it, `setb -n` and `saveb` name and save the buffer, `C-b ]` pastes it, `set -g mouse on` finishes.

The catch is the gap between the two searches: `find-window` reads what a pane shows now, so it finds the crash notice printed last, while the token printed earlier is only in the scrollback, where copy mode's search can reach it.

## Do this

Reach this state:

1. The window that printed `crashed` is current, found with `C-b f`.
2. The `tok-` value from its scrollback is copied into a buffer.
3. That buffer is named `token` and saved to `~/token.txt`.
4. The token is pasted into the shell in window 0.
5. The `mouse` option is on.

## What just happened

`find-window` filtered by visible content; `search-backward-incremental` walked the full scrollback. `copy-selection-and-cancel` made `buffer0`; `set-buffer -n` turned it into a named buffer that will not be recycled; `save-buffer` wrote it out; `paste-buffer` typed it back in.

## Go further

- `list-buffers` shows every buffer and a sample of its text.
- With the mouse on, a drag copies text the same way `M-w` does.
