---
title: "Kill the server"
slug: "kill-the-tmux-server"
summary: "Shut down every session at once with kill-server, and see why exiting the last shell does the same."
level: 1
task: 10
difficulty: beginner
estimatedMinutes: 3
concepts: [server, kill-server, exit]
keys:
  - key: ":kill-server"
    command: "kill-server"
    description: "Kill the tmux server and every session, window and pane in it"
wikiSections: ["Killing tmux entirely", "Listing sessions", "The command prompt"]
challenge: false
objective: "Confirm with tmux ls that two sessions exist, then kill the whole server so that tmux ls reports no server."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux new-window -d -t learn -n logs"
  - "tmux new-session -d -s scratch -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: server-down
    description: "The tmux server has been killed; tmux ls reports no server running"
    kind: shell
    command: "tmux ls >/dev/null 2>&1 && echo up || echo down"
    expect: "^down$"
hints:
  - "`tmux ls` still works from inside a pane. It lists every session on the server, not just the one you are attached to."
  - "The command that stops the whole server is `kill-server`. Type it at the command prompt, not the shell prompt."
  - "Press `C-b :` to open the command prompt, type `kill-server`, then press Enter. There is no confirmation, so it happens at once."
---

Session `learn` has two windows now, and a second session, `scratch`, sits alongside it. When you are done with the build box for the day, closing each pane one at a time is slow. You want the whole server gone in one step.

## Concept

The server (Level 1, Task 1) is the single background process holding every session, window and pane. It quits on its own once nothing is left running in it: a pane's program ends, the pane closes, and if that pane was the last one in its window, the window closes too. A session with no windows left closes with it, and a server with no sessions left exits.

Typing `exit` at a shell prompt does not talk to tmux at all. It ends the shell running in that pane, and tmux reacts to the program finishing by tearing down the pane, then the window, following the chain above. That chain is why the single `exit` in Level 1, Task 1 closed the whole first session: it was the only pane, in the only window, of the only session.

`kill-server` skips the chain. Entered at the command prompt (Level 1, Task 4), opened with `C-b :`, it is a command like `new-session` or `list-sessions` (Level 1, Task 6), except it is not aimed at any particular session, window or pane. It targets the whole server, so it closes everything on it immediately, whether or not the programs inside are still running, and with no confirmation.

## Do this

1. In the attached pane, run `tmux ls`. Two sessions are listed: `learn`, with two windows, and `scratch`, with one.

   ```bash
   tmux ls
   ```

2. Type `exit` and press Enter. This pane's shell ends, so tmux closes the pane and the `shell` window with it. Session `learn` still has the `logs` window, so you stay attached, now looking at that window instead.

3. Press `C-b :` to open the command prompt. Type the command below and press Enter.

   ```text
   kill-server
   ```

4. The screen returns to the plain shell you started from. Every session, window and pane on the server is gone, including `scratch`, which had no client attached at all.

**Done when** the tmux server is no longer running, so `tmux ls` reports that there is no server.

## What just happened

Step 2 never touched tmux directly. It ended the shell in the pane, and tmux followed the close-when-empty rule: the pane closed, then the empty `shell` window closed. Session `learn` still had `logs`, so the session and the server both stayed up, and your client moved to the surviving window.

`kill-server` in step 3 works differently. It does not wait for programs to finish and does not check whether a session still has windows in it. It stops the server outright, which destroys every session, window and pane it was holding, including `scratch`, which had nothing to do with the pane you were sitting in. That is also why `tmux ls` afterwards reports an error instead of a list: there is no server left to ask.

## Go further

- `kill-session -t learn` closes only the `learn` session and its windows, leaving `scratch` running untouched.
- Detaching with `C-b d` (Level 1, Task 5) leaves the server and every session running. Only exiting every pane, or running `kill-server`, stops it.
