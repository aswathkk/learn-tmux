---
title: "Move between panes"
slug: "move-between-panes"
summary: "Change the active pane with the arrow keys, cycle with o, and jump by number with q."
level: 1
task: 9
difficulty: beginner
estimatedMinutes: 4
concepts: [active-pane, pane-index, navigation]
keys:
  - key: "C-b Up"
    command: "select-pane -U (also Down -D, Left -L, Right -R)"
    description: "Make the pane above, below, left or right the active pane; wraps around"
  - key: "C-b o"
    command: "select-pane -t :.+"
    description: "Move to the next pane by number"
  - key: "C-b q"
    command: "display-panes"
    description: "Show pane numbers briefly; press a number to jump to that pane"
wikiSections: ["Changing the active pane", "Summary of terms"]
challenge: false
objective: "Visit pane C, then pane A, then finish with pane B active."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux set -g pane-border-status top"
  - "tmux split-window -h -t learn:0"
  - "tmux split-window -v -t learn:0"
  - "tmux select-pane -t learn:0.0 -T A"
  - "tmux select-pane -t learn:0.1 -T B"
  - "tmux select-pane -t learn:0.2 -T C"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: visit-pane-c
    description: "Pane C (index 2) is the active pane in window learn:0"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^2$"
  - id: return-to-pane-a
    description: "Pane A (index 0) is the active pane in window learn:0"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^0$"
  - id: finish-on-pane-b
    description: "Pane B (index 1) is the active pane in window learn:0, the final state"
    kind: tmux
    command: "display-message -p -t learn:0 '#{pane_index}'"
    expect: "^1$"
hints:
  - "The setup labelled each pane in its border: A is pane 0, B is pane 1, C is pane 2. Pane A is active to start."
  - "`C-b q` prints a number over every pane for a few seconds. Press the digit for the pane you want before it disappears."
  - "Order matters: jump to C first, then move to A, then move to B. `C-b o` moves to the next pane by number."
  - "Sequence: `C-b q` then `2` to reach C. `C-b Left` to reach A (its only neighbour on that side). `C-b o` to reach B."
---

Three panes are only useful if you can move between them fast. tmux gives you three ways: step in a direction, jump straight to a pane by number, or step to the next one in order.

## Concept

Only one pane in a window is active at a time. The active pane is where your typing goes; the other panes keep running whatever they are running, but keystrokes reach the active one alone.

Panes are numbered by their position in the window, starting at 0, not by the order you created them. If two panes are later swapped, their numbers move with the positions, not with the panes. You will see this in Level 2, Task 7.

tmux changes the active pane three ways. `C-b Up`, `C-b Down`, `C-b Left` and `C-b Right` move to the pane above, below, left or right of the active one, and wrap around the edges of the window instead of doing nothing. `C-b o` moves to the next pane in number order. `C-b q` prints each pane's number on top of it for a few seconds; press a number key before it fades to jump straight to that pane.

## Do this

This window has the three panes from Level 1, Task 7: pane 0 on the left, pane 1 top right, pane 2 bottom right. The setup labelled them A, B and C in their borders. Pane A is active now.

1. Press `C-b q`. A large number appears on top of each pane.
2. Before the numbers disappear, press `2`. The active pane jumps straight to C.
3. Press `C-b Left`. The active pane moves to A.
4. Press `C-b o`. The active pane moves to the next one by number, B.

**Done when** you have visited pane C, then pane A, and pane B is the active pane.

## What just happened

`C-b q` runs `display-panes`, which is why it needs a follow-up key: it shows each pane's number for a short time and waits for you to press one, which runs `select-pane` targeted at that pane.

`C-b Left` runs `select-pane -L`; `-U`, `-D` and `-R` do the same for the other three directions. From C, the only pane bordering it on the left is A, so `-L` lands there. These keys wrap around the window, so pressing one on a pane at an edge moves to the pane at the opposite edge instead of doing nothing.

`C-b o` runs `select-pane -t :.+`, a target that means "the next pane by number". From A that is B.

One mistake is common: keep holding Ctrl through the arrow key instead of releasing it after `b`. That combination resizes the pane instead of selecting one; resizing is a later lesson, Level 2, Task 5.

## Go further

- From the command prompt (`C-b :`), `select-pane -t 2` jumps straight to a pane by number, the same as `C-b q 2` without the on-screen numbers.
- `C-b C-o` rotates every pane in the window round by one position instead of only moving the active pane.
