---
title: "Kill a pane, a window and a session"
slug: "kill-pane-window-session"
summary: "Close things at each level of the model with x, & and kill-session."
level: 2
task: 3
difficulty: intermediate
estimatedMinutes: 4
concepts: [kill-pane, kill-window, kill-session, confirmation]
keys:
  - key: "C-b x"
    command: "kill-pane (confirm-before)"
    description: "Kill the active pane after a y/n prompt"
  - key: "C-b &"
    command: "kill-window (confirm-before)"
    description: "Kill the current window and all its panes after a y/n prompt"
  - key: ":kill-session -t name"
    command: "kill-session -t"
    description: "Kill a session and all its windows; without -t kills the attached session"
wikiSections: ["Killing a session, window or pane", "The command prompt"]
challenge: false
objective: "Reduce window 0 to two panes, kill the scratch window, and kill the session named old, leaving only learn."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux split-window -h -t learn:0"
  - "tmux split-window -v -t learn:0 'yes > /dev/null'"
  - "tmux new-window -d -t learn -n scratch"
  - "tmux new-window -d -t learn -n logs 'tail -f /dev/null'"
  - "tmux new-session -d -s old -x 120 -y 36"
  - "tmux select-window -t learn:0"
startCommand: "tmux attach -t learn"
checks:
  - id: two-panes
    description: "Window 0 of session learn (editor) has exactly two panes"
    kind: tmux
    command: "display-message -p -t learn:0 '#{window_panes}'"
    expect: "^2$"
  - id: scratch-window-killed
    description: "Session learn keeps only the windows editor and logs, in that order"
    kind: tmux
    command: "list-windows -t learn -F '#{window_name}'"
    expect: "^editor\\nlogs$"
  - id: session-old-killed
    description: "Only the session learn remains on the server"
    kind: shell
    command: "tmux ls -F '#{session_name}' | tr '\\n' ','"
    expect: "^learn,$"
hints:
  - "Every create command has a kill command: `split-window` undoes with `C-b x`, `new-window` undoes with `C-b &`. Both ask for confirmation; press `y` to go ahead."
  - "Check which window is current before pressing `C-b &`. It kills the current window, not one you name, so switch to `scratch` first with a key from Level 2, Task 1."
  - "`kill-session` has no key binding. There is no way to reach session `old` with the prefix while you are attached to `learn`, so use the command prompt instead."
  - "Open the prompt with `C-b :` (Level 1, Task 4), type `kill-session -t old`, and press Enter."
---

Every session you build fills up with panes, windows and stray sessions you no longer need. tmux has a kill command for each level of the model, and each one asks before it acts.

## Concept

`kill-pane` destroys the target pane. If it was the last pane in its window, the window closes too. `kill-window` destroys the current window, or the one you name, and every pane in it goes with it. `kill-session` destroys a whole session: every window it holds, and it detaches any client attached to it. Run it with no `-t` and it kills the session you are attached to, which detaches you on the spot.

`C-b x` and `C-b &` do not run `kill-pane` and `kill-window` directly. They run `confirm-before`, which asks a yes/no question on the status line first and only runs the command if you answer `y`. Anything else cancels. `confirm-before` builds its own prompt from the command name unless you give it one with `-p`.

Killing is not the same as exiting. Typing `exit` at a shell ends that program on its own terms, and the pane closes because nothing is left running in it. Killing forces the pane, window or session closed regardless of what is running there, which matters for a program like `yes` that never exits by itself.

There is no key bound to `kill-session`, and no key can target a session you are not attached to. For that you use the command prompt, opened with `C-b :`.

## Do this

1. Look at window 0, named `editor`. It has three panes; the active one, marked by the highlighted border, is running `yes` piped to `/dev/null`, spinning uselessly. Press `C-b x`. The status line asks `kill-pane #P? (y/n)`.
2. Press `y`. The pane closes. Window 0 keeps its other two panes.
3. Switch to the `scratch` window with `C-b n` (Level 2, Task 1). The status line shows `scratch` as the current window.
4. Press `C-b &`. The status line asks `kill-window scratch? (y/n)`.
5. Press `y`. The `scratch` window and its one pane close. Only `editor` and `logs` remain.
6. Open the command prompt with `C-b :`. Type the line below and press Enter.

   ```text
   kill-session -t old
   ```

7. The prompt closes and nothing changes on your screen. Session `old` ran no window you could see, but it is gone from the server.

**Done when** window 0 of `learn` has two panes, only `editor` and `logs` remain as windows, and session `old` no longer exists.

## What just happened

`C-b x` asked `confirm-before` to run `kill-pane` on the active pane. `kill-pane` destroyed it immediately, and because two panes remained in the window, the window itself stayed open. `C-b &` did the same for `kill-window`: it killed whichever window was current, taking every pane in it, which is why you switched to `scratch` before pressing it. Killing the wrong window is the easy mistake here; nothing warns you which window `C-b &` is about to close beyond the confirmation prompt naming it.

`kill-session -t old` named its target explicitly, so it worked from inside a different session. There is no key for `kill-session` because it is rarely something you want bound to a single keystroke, and running it without `-t` kills the session you are attached to and detaches you.

## Go further

- `kill-pane -a -t <pane>` and `kill-window -a -t <window>` keep the given pane or window and kill every other one at the same level. Useful for clearing clutter fast.
- `kill-session -a -t learn` keeps `learn` and kills every other session in one command, the opposite of naming the one you want gone.
- `confirm-before -p "sure?" -y kill-window` changes the prompt text and makes a bare Enter run the command instead of cancelling it.
