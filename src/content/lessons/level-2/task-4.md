---
title: "Zoom a pane"
slug: "zoom-a-pane"
summary: "Make one pane fill the window temporarily and see the Z flag in the status line."
level: 2
task: 4
difficulty: intermediate
estimatedMinutes: 3
concepts: [zoom, window-zoomed-flag, status-flags]
keys:
  - key: "C-b z"
    command: "resize-pane -Z"
    description: "Toggle zoom: the active pane fills the window, press again to restore"
wikiSections: ["Resizing and zooming panes", "The status line"]
challenge: false
objective: "Zoom pane B (index 1) and leave it zoomed, filling window 0 of session learn."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux set-option -g pane-border-status top"
  - "tmux split-window -h -t learn:0.0"
  - "tmux split-window -v -t learn:0.1"
  - "tmux select-pane -t learn:0.0 -T A"
  - "tmux select-pane -t learn:0.1 -T B"
  - "tmux select-pane -t learn:0.2 -T C"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: pane-b-zoomed
    description: "Window 0 of session learn is zoomed with pane 1 (B) active"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_zoomed_flag}:#{pane_index}'"
    expect: "^1:1$"
hints:
  - "Zoom toggles the active pane, so move to pane B before you press the zoom key."
  - "From pane A, press `C-b o` to step to the next pane by number, which is pane B, just as in Level 1, Task 9."
  - "Once B is active, press `C-b z`. If nothing seems to happen, check the status line for a `Z` flag; that means it worked."
  - "Do not press `C-b z` a second time on B, that would unzoom it again. Leave it zoomed."
---

Window 0 has three panes now: an editor on the left and two smaller ones on the right. Reading a long log in one of the small panes means squinting at a sliver of the screen while the others sit there unused. Zooming borrows the whole window for one pane, without touching the split underneath.

## Concept

The setup already labelled each pane's border A, B or C, so you can tell them apart. Pane A is active.

A single pane can be temporarily made to take up the whole window, hiding the other panes. This is zooming. Pressing the same key again puts the pane and the window's layout back exactly how it was: unzooming. The other panes are hidden, not gone.

A window with a zoomed pane is marked with a `Z` in the status line, right after the window name. You have already seen the window list mark the current window with `*` and the last window with `-`; `Z` is a third flag, and more than one can show at once.

Commands that change the size or position of panes in a window automatically unzoom it. Level 2, Tasks 5 and 6 resize panes and apply layouts, so keep this in mind: zoom last, after the panes are arranged the way you want.

## Do this

1. Look at the status line and the pane borders. Pane A is active, on the left; B is top right; C is bottom right.
2. Move to pane B, the next pane by number.

   ```text
   C-b o
   ```

3. Zoom it.

   ```text
   C-b z
   ```

   Pane B fills the window. Panes A and C disappear, and the status line shows a `Z` after the window name.
4. Press `C-b z` again. Pane B shrinks back to its top-right slot and A and C reappear.
5. Press `C-b z` once more on pane B, and leave it zoomed this time.

**Done when** window 0 is zoomed with pane B (index 1) as the active, zoomed pane.

## What just happened

`C-b z` runs `resize-pane -Z`, which toggles the active pane between zoomed, occupying the whole of the window, and unzoomed, back in its normal position in the layout. It acts on whichever pane is active, which is why moving to B before pressing the key matters: zoom pane A instead and you get the wrong pane filling the window.

Nothing about the underlying split changed while B was zoomed. Unzooming in step 4 restored the exact three-pane layout, because tmux only hides the other panes rather than closing them. That is also why a command that resizes a pane or reflows the layout unzooms the window first: the old zoomed size would no longer make sense against a changed layout.

The `Z` you saw in the status line is the same kind of flag as the `*` for the current window and `-` for the last one, just for zoom state.

## Go further

- `resize-pane -Z` also works from the command prompt: press `C-b :`, type `resize-pane -Z`, and press Enter to zoom or unzoom the active pane without the key.
- A target can be given explicitly, for example `resize-pane -Z -t 1`, to zoom a pane other than the active one.
