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
objective: "Add a full-width pane at the bottom running tail -f ~/build.log, then a full-height pane on the far left, then a fifth pane that does not become active."
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
  - 'Open the command prompt with `C-b :`. At the prompt, `-h` or `-v` is not assumed the way it is for `C-b %` or `C-b "`; you give the flag yourself.'
  - "Make the bottom pane first: `splitw -fv tail -f ~/build.log`. `-f` spans the full width or height instead of just the pane being split, and a command can follow the flags."
  - "Make the left pane next, from wherever the tail pane left you: `splitw -fhb`. `-h` spans the full height, `-b` puts the new pane before the rest instead of after."
  - "Add the last pane with `splitw -d`, so the active pane (the one with the highlighted border) stays where it was."
---

The plain `split-window` from Level 1, Task 7 only cuts the pane you are in. Its flags reach further: a pane that spans the whole window, one placed before instead of after, and one that does not take over as active.

## Concept

`C-b %` and `C-b "` are `split-window -h` and `split-window -v` with everything else left at its default. Typed out at the command prompt, `split-window` takes more flags, and none of them are assumed: you write `-h` or `-v` yourself, and if you leave both out, tmux assumes `-v`.

The `-f` flag makes the new pane span the window's full width, with `-v`, or full height, with `-h`, instead of being limited to the size of the pane it split. `-b` puts the new pane before the one it split, to the left or above, instead of after. `-d` leaves the active pane where it is instead of switching to the new one. Like any short tmux flags, they combine: `-fhb` is `-f`, `-h` and `-b` together.

A command can follow the flags, the same way `new-window` took one in Level 1, Task 4. `split-window -f -v tail -f ~/build.log` runs `tail` in the new pane instead of a shell.

## Do this

1. Press `C-b :` to open the command prompt. Type `splitw -fv tail -f ~/build.log` and press Enter. A pane spanning the full width appears at the bottom, running `tail` on the build log, and becomes active.

2. Press `C-b :` again. Type `splitw -fhb` and press Enter. A pane spanning the full height appears at the far left, and becomes active.

3. Press `C-b :` once more. Type `splitw -d` and press Enter. A fifth pane appears, but the green border stays on the pane you were just in.

**Done when** window 0 of session `learn` has five panes: a full-width one at the bottom running `tail`, a full-height one at the far left, and one more added without moving the active pane.

## What just happened

`splitw -fv tail -f ~/build.log` ran `split-window -f -v` with a command. `-v` made it a horizontal band, and `-f` let it span the full width instead of just the width of the pane it split. With no `-d`, the new pane running `tail` became active.

`splitw -fhb` combined `-f`, `-h` and `-b`. `-h` made it a vertical column spanning the full height, and `-b` put it before the rest, at the far left, instead of after. Order matters here: making the full-width pane first, then the full-height one, means the full-height pane spans whatever height is left after the bottom pane took its rows. Done the other way round, the later full-width split would cut into the full-height pane and shorten it.

`splitw -d` ran plain `split-window -d`, defaulting to `-v` since neither `-h` nor `-v` was given, on whichever pane was active, the full-height one. It added a fifth pane without moving the active one. Forgetting `-d` is a common mistake: the newest pane always becomes active unless you say otherwise, so the next split lands somewhere you did not intend.

## Go further

- `-l` sets an exact size for the new pane, in lines or columns; `-p` is a shorthand for a percentage of the available space.
- The same flags work in a key binding in `.tmux.conf`, not only at the command prompt.
