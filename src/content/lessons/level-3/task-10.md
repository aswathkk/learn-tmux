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
objective: "Find the window that reported a crash, copy the tok- token from its scrollback, store it in a buffer named token, save that buffer to ~/token.txt, paste it into window 0 and leave the mouse enabled."
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
  - "`C-b f` searches the visible content of every pane, not the scrollback. The crash line is on screen; the token is not."
  - "Once you are in the right window, `C-b [` then `C-r` searches backwards through the scrollback for text you type."
  - "After `M-w` copies the token, rename `buffer0` with `:setb -bbuffer0 -ntoken`, then `:saveb -btoken ~/token.txt`."
  - "Switch to window 0 with `C-b 0`, paste with `C-b ]`, then turn the mouse on with `:set -g mouse on`."
---

The pager went off. Some worker crashed and printed a token to its own scrollback before the crash notice pushed it off screen. An on-call engineer needs that token in a file and in the shell, right now.

## Concept

This task chains together everything Level 3 taught: finding a window, searching scrollback in copy mode, naming and saving a buffer, and pasting it back out. Nothing new is introduced. The point is choosing the right tool at each step, the way an incident unfolds: you know something crashed, you don't know where, and the detail you need has already scrolled past.

`find-window` filters by what a pane shows right now, not by its full history. A crash message printed last is visible; a line printed earlier is not, even though it is in the same pane's scrollback. That gap is exactly what makes the token worth searching for separately once you have found the pane.

## Do this

1. Look for the crash. Press `C-b f`, type `crashed`, and press Enter. Tree mode opens filtered to panes whose visible content, title, or window name matches. One pane matches: it is running the worker's log.

2. Press Enter to jump to that window. The crash notice is the last line on screen; the token is further up, out of view.

3. Enter copy mode and search backwards for it: press `C-b [`, then `C-r`, type `token=`, and press Enter. The cursor jumps to the `FATAL` line carrying `token=tok-8a1f4c9e2b`.

4. Move the cursor to the start of `tok-8a1f4c9e2b`, press `C-Space` to start a selection, move to the end of the token, then press `M-w` to copy it and leave copy mode.

5. Open the command prompt with `C-b :` and rename the automatic buffer:

   ```text
   setb -bbuffer0 -ntoken
   ```

6. Open the command prompt again and save the named buffer to a file:

   ```text
   saveb -btoken ~/token.txt
   ```

7. Switch to window 0 with `C-b 0`, then paste the token into its shell with `C-b ]`.

8. Turn the mouse on for the rest of the session:

   ```text
   set -g mouse on
   ```

**Done when** a buffer named `token` holds the value, `~/token.txt` contains it, the shell in window 0 has it pasted in, and the mouse option is on.

## What just happened

`C-b f` runs `find-window` and filters tree mode by visible pane content, titles, and window names, which is why it found the crash line but not the token above it. `C-r` inside copy mode runs a backward incremental search through the pane's full scrollback, which is where the earlier line still lives.

`M-w` runs `send-keys -X copy-selection-and-cancel`, dropping the selection into a fresh automatic buffer such as `buffer0`. `setb -bbuffer0 -ntoken` runs `set-buffer -b -n`, which renames that buffer to `token` and turns it into a named buffer, so it will not be recycled once 50 automatic buffers pile up. `saveb -btoken ~/token.txt` runs `save-buffer -b`, writing the buffer's contents straight to disk. Back in window 0, `C-b ]` runs `paste-buffer`, which pastes the most recently used buffer, still `token`, into the active pane. Finally, `set -g mouse on` runs `set-option -g mouse on`, so the session responds to clicks and drags for the rest of your work.

## Go further

- `list-buffers` shows every buffer with `#{buffer_name}` and a sample of its text, useful for checking which one is current before pasting.
- `load-buffer` is the reverse of `save-buffer`: it reads a file straight into a named buffer.
- With the mouse on, dragging over text in a pane copies it the same way `M-w` does, without touching copy mode at all.
