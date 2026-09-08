---
title: "Break out, join and send keys"
slug: "break-join-and-send-keys"
summary: "Move a pane into its own window, pull a window back in as a pane, and type into a pane from the command prompt."
level: 3
task: 7
difficulty: advanced
estimatedMinutes: 4
concepts: [break-pane, join-pane, send-keys, targets]
keys:
  - key: "C-b !"
    command: "break-pane"
    description: "Move the active pane into a new window"
  - key: ":join-pane -s src"
    command: "join-pane -s"
    description: "Move a pane from another window into the current window as a new pane"
  - key: ":send-keys -t target keys"
    command: "send-keys -t"
    description: "Send keystrokes to a pane, for example a command followed by Enter"
wikiSections: ["Other features", "Splitting the window"]
challenge: false
objective: "Break the tail pane out of window 0, join the pane of window shell into window 0, then use send-keys to run echo joined-ok in that pane."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux split-window -h -t learn:0 'tail -f /dev/null'"
  - "tmux new-window -d -t learn -n shell"
  - "tmux select-window -t learn:0"
  - "tmux select-pane -t learn:0.1"
startCommand: "tmux attach -t learn"
checks:
  - id: tail-in-own-window
    description: "The tail pane now lives alone in window 2"
    kind: tmux
    command: "list-windows -t learn -F '#{window_index}:#{pane_current_command}'"
    expect: "^2:tail$"
  - id: shell-joined-window-0
    description: "Window 1 is gone and window 0 has two panes"
    kind: tmux
    command: "list-windows -t learn -F '#{window_index}:#{window_panes}'"
    expect: "^0:2\\n2:1$"
  - id: echo-ran-in-joined-pane
    description: "send-keys ran echo joined-ok in the joined pane"
    kind: tmux
    command: "capture-pane -p -t learn:0.1"
    expect: "joined-ok"
hints:
  - "First break the tail pane out with `C-b !`. Do this from window 0, on the tail pane."
  - "Back in window 0, open the command prompt with `C-b :` and run `join-pane -s shell`. The `-s` flag names the source window."
  - "To type into a pane without clicking it, use the command prompt: `:send-keys -t learn:0.1 'echo joined-ok' Enter`."
  - "The full sequence: `C-b !` on the tail pane, then in window 0 `:join-pane -s shell`, then `:send-keys -t learn:0.1 'echo joined-ok' Enter`."
---

So far every pane has stayed in the window where it was created. tmux also lets you move a pane out of its window on its own, or pull a pane from one window into another, which is how you consolidate work that ended up scattered across windows.

## Concept

A pane does not have to stay where `split-window` put it. `break-pane` takes the active pane out of its window and gives it a new window of its own. `join-pane` does the reverse: it takes a pane from some other window and moves it into the current window as a new pane, as if you had split for it.

`join-pane` needs to know which pane to bring in. Its `-s` flag takes a source target, and the current window (where the pane will land) is the target of the command itself. A target can name a window by name, so `join-pane -s shell` means "move the active pane of the window called shell here."

Once a pane is part of a window, you can act on it without touching it directly. `send-keys` writes keystrokes into a target pane's input, the same keystrokes the pane would see if you typed them at the keyboard. A plain word is typed literally; `Enter` is sent as the Enter key. This is how a script, or you from the command prompt, can drive a program in a pane you are not looking at.

## Do this

1. You are attached to session `learn`, window 0, with two panes: an editor on the left and a pane running `tail -f /dev/null` on the right, which is the active pane. Press `C-b !`. The tail pane leaves window 0 and becomes its own window, window 2.

2. Look at the window list at the bottom. Window 0 now has one pane, and a new window 2 named `tail` has appeared after window `shell` at index 1.

3. Move back to window 0 with `C-b 0`.

4. Open the command prompt with `C-b :`, type `join-pane -s shell`, and press Enter. The active pane of window `shell` moves into window 0 as a second pane, and window 1 disappears since it has nothing left in it.

5. Check the window list: it should read `0:editor` with two panes and `2:tail`, with no window 1.

6. Open the command prompt again with `C-b :` and run `send-keys -t learn:0.1 'echo joined-ok' Enter`. The command runs in pane 1 of window 0 even though you are not looking at it, and it prints `joined-ok`.

**Done when** the tail pane lives alone in window 2, window 0 has the joined pane as its second pane, and that pane's output includes `joined-ok`.

## What just happened

`C-b !` runs `break-pane`. It took the active pane, the one running `tail`, out of window 0 and gave it a new window, so the pane's history and running program carried over unchanged.

`join-pane -s shell` did the opposite: it moved the active pane of the window named `shell` into the current window, window 0, as a new pane. The `-s` flag is the source target; the destination is the window you ran the command from. Since that pane was the only one in window `shell`, the window closed once it was empty, the same way `kill-pane` closes a window's last pane (Level 2, Task 3).

`send-keys -t learn:0.1 'echo joined-ok' Enter` sent two things to pane 1 of window 0: the literal text `echo joined-ok`, then the Enter key as a separate argument. tmux treats each argument to `send-keys` as a chunk of keys, so a named key like `Enter` is recognised instead of being typed as the word "Enter". This is the same target syntax, `session:window.pane`, used throughout this level.

## Go further

- `join-pane` also accepts `-h` or `-v` to choose how the incoming pane is split into the window, and `-t` to target where it lands rather than always the current window.
- `break-pane` takes `-n` to name the new window, so you do not have to rename it afterward with `C-b ,`.
- The "Other features" section of the wiki lists more scripting tools worth reading on your own: `capture-pane` and `pipe-pane` for reading pane output, `respawn-pane` and `respawn-window` for restarting a dead program in place, session groups, hooks, and custom menus with `display-menu`.
