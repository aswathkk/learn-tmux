---
title: "Split with flags"
slug: "split-with-flags"
summary: "Use split-window flags from the command prompt to make a full-width bottom pane, a full-height left pane, and one that does not steal focus."
level: 1
task: 8
difficulty: beginner
estimatedMinutes: 4
concepts: [split-window-flags, full-span-pane, command-prompt]
keys:
  - key: ":splitw -fv"
    command: "split-window -f -v"
    description: "New pane spans the full width (or with -fh the full height) of the window instead of only the pane being split; a command may follow"
  - key: ":splitw -fhb"
    command: "split-window -b"
    description: "Put the new pane to the left of (or above) the pane being split"
  - key: ":splitw -d"
    command: "split-window -d"
    description: "Do not make the new pane the active pane"
wikiSections: ["Splitting the window", "The command prompt"]
challenge: false
objective: "Window 0 has five panes: a full-width `tail` pane at the bottom and a full-height pane on the left."
setup:
  - "seq 1 40 > /home/alpine/build.log"
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux split-window -h -t learn:0"
  - "tmux select-pane -t learn:0.0"
startCommand: "tmux attach -t learn"
checks:
  - id: full-width-bottom
    description: "A pane at the bottom of window 0 spans the full width and runs tail"
    kind: tmux
    command: "list-panes -t learn:0 -F '#{pane_at_bottom}:#{?#{==:#{pane_width},#{window_width}},full,part}:#{pane_current_command}'"
    expect: "^1:full:tail$"
  - id: full-height-left
    description: "A pane at the left of window 0 spans the full height"
    kind: tmux
    command: "list-panes -t learn:0 -F '#{pane_at_left}:#{?#{==:#{pane_height},#{window_height}},full,part}'"
    expect: "^1:full$"
  - id: five-panes
    description: "Window 0 of session learn has five panes"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_panes}'"
    expect: "^5$"
hints:
  - "The newest pane becomes active unless you say otherwise, so add `-d` to the last split to keep the border where it is."
  - "At the prompt nothing is assumed: give `-h` or `-v` yourself. `-f` spans the whole window; `-b` puts the new pane before, meaning left or above."
  - "`splitw -fv tail -f ~/build.log`, then `splitw -fhb`, then `splitw -d`. Each from `C-b :`."
---

## Concept

At the prompt, `split-window` takes flags the keys cannot: `-f` makes the new pane span the full width or height of the window, `-b` puts it before the pane you split (left or above), and `-d` leaves the active pane where it is. Flags combine: `-fhb`.

`C-b %` and `C-b "` are `split-window -h` and `-v` with defaults. Typed out, you give the direction yourself; with neither, tmux assumes `-v`. A command after the flags runs in the new pane instead of a shell, as with `new-window`.

Order matters with `-f`: a full-width pane made first keeps the rows it took, and a full-height pane made after it spans only what is left.

## Do this

1. Press `C-b :`, type `splitw -fv tail -f ~/build.log`, Enter. A pane running `tail` spans the whole bottom and is active.
2. Press `C-b :`, type `splitw -fhb`, Enter. A pane spans the full height at the far left and is active.
3. Press `C-b :`, type `splitw -d`, Enter. A fifth pane appears below it, and the green border stays put.

## What just happened

`-f` split the window rather than the pane, `-b` chose the near side, and `-d` skipped the usual move of focus to the new pane. Without `-d`, every split moves the active pane, and the next split lands somewhere you did not mean.

## Go further

- `-l 10` sets the new pane's size in lines or columns; `-l 30%` a percentage.
- The same flags work in a `bind` line in `.tmux.conf`.
