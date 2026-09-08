---
title: "Mouse copying behaviour"
slug: "mouse-copying"
summary: "Change what happens when a mouse drag ends so the selection stays visible after it is copied."
level: 4
task: 10
difficulty: expert
estimatedMinutes: 4
concepts: [mouse, copy-mode, key-bindings, MouseDragEnd1Pane]
keys:
  - key: ":bind -Tcopy-mode MouseDragEnd1Pane send -X copy-selection-no-clear"
    command: "bind-key -T copy-mode MouseDragEnd1Pane"
    description: "Copy on release but keep the selection highlighted and stay in copy mode"
  - key: ":unbind -Tcopy-mode MouseDragEnd1Pane"
    command: "unbind-key -T copy-mode MouseDragEnd1Pane"
    description: "Do nothing on release; copy with the keyboard instead"
wikiSections: ["Mouse copying behaviour", "Using the mouse", "Copy mode key bindings"]
challenge: false
objective: "Enable the mouse, make a mouse drag copy without clearing the selection, and copy the token line by dragging over it."
setup:
  - "echo 'token: mouse-copy-4d9e2b' > /home/alpine/notes.txt"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
  - "tmux new-session -d -s learn -n notes -x 120 -y 36 \"sh -c 'cat ~/notes.txt; exec sh'\""
startCommand: "tmux attach -t learn"
checks:
  - id: mouse-on
    description: "The mouse option is on"
    kind: tmux
    command: "show-options -gv mouse"
    expect: "^on$"
  - id: dragend-rebound
    description: "MouseDragEnd1Pane in the copy-mode table runs copy-selection-no-clear"
    kind: tmux
    command: "list-keys -T copy-mode MouseDragEnd1Pane"
    expect: "copy-selection-no-clear"
  - id: token-copied
    description: "A buffer holds the token line, from a mouse drag or a keyboard copy"
    kind: tmux
    command: "list-buffers -F '#{buffer_sample}'"
    expect: "mouse-copy-4d9e2b"
hints:
  - "Turn the mouse on first: `:set -g mouse on`. Without it a drag just selects text in your terminal emulator, not in tmux."
  - "The binding to change is `MouseDragEnd1Pane` in the `copy-mode` table: `:bind -Tcopy-mode MouseDragEnd1Pane send -X copy-selection-no-clear`."
  - "Check the default first with `C-b /` or `tmux lsk -Tcopy-mode MouseDragEnd1Pane` from another pane: it runs `copy-pipe-and-cancel`, which is why a drag normally exits copy mode."
  - "Once the mouse is on and the binding is set, hold the left button down on the `token:` line, drag across it, then release. If your terminal does not forward mouse drags to tmux, enter copy mode with `C-b [`, press `C-Space`, move to the end of the line, and press `M-w` instead."
---

Dragging the mouse to select text in a pane is convenient, but by default tmux copies the selection and immediately leaves copy mode. That is often the wrong moment to lose your place.

## Concept

Every mouse action in tmux is a key binding, the same as a key press. A drag inside a pane generates `MouseDragEnd1Pane` when the button is released, and that name is bound in a key table exactly like `C-a` or `M-w`. Level 3, Task 6 turned the `mouse` option on so tmux starts reading these events at all.

The binding lives in the `copy-mode` key table, because releasing the mouse after a drag only means something while tmux is already in copy mode selecting text. Task 9 put vi-style bindings in `copy-mode-vi`; this server has not set `mode-keys vi`, so `copy-mode` is the table that matters here.

The default binding runs `copy-pipe-and-cancel`, a copy mode command from the table in the wiki's "Copy mode key bindings" section. It copies the selection to a buffer, pipes it to the configured command if there is one, and cancels copy mode, closing the pane back to normal view. That is why a drag both copies and exits in one motion.

The wiki lists two more useful choices for `MouseDragEnd1Pane`: `copy-selection-no-clear`, which copies but leaves the selection highlighted and copy mode open, and an unbound key, which does nothing at all so only the keyboard can copy.

## Do this

1. Attach to session `learn`. Window 0 runs `notes` and has already printed the file `notes.txt`, which ends with a line starting `token:`.

2. Turn the mouse on.

   ```text
   :set -g mouse on
   ```

3. Check the current binding for the release event.

   ```text
   :list-keys -T copy-mode MouseDragEnd1Pane
   ```

   The command shown is `send-keys -X copy-pipe-and-cancel`.

4. Rebind it so a drag copies without clearing the selection or leaving copy mode.

   ```text
   :bind -T copy-mode MouseDragEnd1Pane send -X copy-selection-no-clear
   ```

5. Confirm the change with the same `list-keys` command from step 3. It now shows `copy-selection-no-clear`.

6. Hold the left mouse button down at the start of the `token:` line, drag to its end, and release. The line stays highlighted and the pane stays in copy mode. If your terminal does not send mouse drags through to tmux, press `C-b [` to enter copy mode by hand, `C-Space` to begin a selection, move to the end of the line, then `M-w` to copy it.

**Done when** the mouse option is on, `MouseDragEnd1Pane` in the `copy-mode` table runs `copy-selection-no-clear`, and a buffer holds the token line.

## What just happened

`:set -g mouse on` set the session option that makes tmux read mouse events at all; without it a drag just selects text in the terminal emulator, never reaching tmux. `:bind -T copy-mode MouseDragEnd1Pane send -X copy-selection-no-clear` is an ordinary `bind-key` command, the same one Task 3 used for regular keys, aimed at the `copy-mode` table and at a mouse event name instead of a key name.

The command it now runs, `copy-selection-no-clear`, is passed with the `-X` flag to `send-keys`, exactly like every other copy mode command in the wiki's table (`cursor-down`, `search-again`, and so on). It copies the pane's selection into a buffer, the same buffer mechanism from Level 3, Task 1, but skips the `-cancel` step that the default binding performs, so the highlight and copy mode both stay put.

Unbinding instead of rebinding, with `unbind -T copy-mode MouseDragEnd1Pane`, removes the release action entirely: a drag then only highlights text, and copying needs the keyboard, with `C-Space` and `M-w` from Level 3, Task 1.

## Go further

- `copy-selection` (without `-no-clear`) copies and clears the highlight but leaves copy mode open, a middle ground between the two rebinds above.
- The same approach works for other mouse events: `MouseDown1Pane`, `MouseDrag1Pane`, and the ones for the status line and pane borders, all listed under "Mouse key bindings" in the manual page.
- Put the working binding in `~/.tmux.conf` with `echo` as in Task 2, so it survives the next time the server starts.
