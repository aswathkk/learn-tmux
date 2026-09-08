---
title: "Write the configuration file"
slug: "tmux-conf-file"
summary: "Create ~/.tmux.conf, load it into the running server, then restart the server to see it load by itself."
level: 4
task: 2
difficulty: expert
estimatedMinutes: 4
concepts: [configuration-file, source-file, server-start, comments]
keys:
  - key: ":echo 'set -g mouse on' >> ~/.tmux.conf"
    command: "(shell) append a line to the configuration file"
    description: "Build the file one command per line; # starts a comment"
  - key: ":source ~/.tmux.conf"
    command: "source-file"
    description: "Run the commands in a file on the running server"
wikiSections: ["The configuration file", "Configuring tmux", "Killing tmux entirely"]
challenge: false
objective: "Create ~/.tmux.conf with a comment and set -g mouse on, source it, then kill the server and start a new session so the file is applied at server start."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux display-message -p '#{pid}' > /home/alpine/.server-pid"
startCommand: "tmux attach -t learn"
checks:
  - id: conf-has-mouse-line
    description: "~/.tmux.conf contains the set -g mouse on line"
    kind: shell
    command: "grep -c '^set -g mouse on' /home/alpine/.tmux.conf"
    expect: "^[1-9]"
  - id: mouse-sourced
    description: "The running server has mouse set to on after sourcing the file"
    kind: tmux
    command: "show-options -gv mouse"
    expect: "^on$"
  - id: server-was-killed
    description: "The old server no longer answers"
    kind: shell
    command: "tmux ls >/dev/null 2>&1 && echo up || echo down"
    expect: "^down$"
  - id: new-server-reads-conf
    description: "A different server is running and it read the configuration file at start"
    kind: shell
    command: "[ \"$(tmux display-message -p '#{pid}')\" != \"$(cat /home/alpine/.server-pid)\" ] && tmux show-options -gv mouse"
    expect: "^on$"
hints:
  - "Build the file with `echo 'text' >> ~/.tmux.conf`, one line per command. `>>` appends; `>` would overwrite what you already wrote."
  - "A line starting with `#` is a comment, ignored by tmux. Add one, then add `set -g mouse on` on its own line."
  - "Load the file into the current server with `C-b :` then `source ~/.tmux.conf`. To see it load on its own, run `:kill-server`, then `tmux new -s learn` from the shell."
  - "The file only runs when the server starts. `tmux new -s learn` after `:kill-server` starts a fresh server, which reads `~/.tmux.conf` before it creates the session."
---

Anything you set on a running server disappears the moment that server exits. A configuration file fixes that: write your settings once and tmux applies them every time it starts.

## Concept

When the tmux server starts, it runs a file called `.tmux.conf` in your home directory. The file is a list of tmux commands, one per line, run in order, exactly as if you had typed them at the command prompt. A line starting with `#` is a comment and is ignored.

The important part is *when* this happens. `.tmux.conf` runs only when the server starts, not when a new session is created inside an already-running server. Options you set by hand with `set -g` in Level 4, Task 1 take effect immediately but vanish once the server exits; options set in `.tmux.conf` come back every time the server starts, because tmux reads the file again.

You do not have to restart the server to try a change. The `source-file` command reads any file of tmux commands and runs it against the current server, so you can edit `.tmux.conf` and reload it without leaving your session.

Configuration files borrow some shell habits but are not shell scripts: `~` expands to your home directory, quotes group arguments with spaces, but constructs like `$()` do not work.

## Do this

1. From the shell inside window 0, build the file one line at a time. Run this first, to add a comment:

   ```bash
   echo '# turn on mouse support' >> ~/.tmux.conf
   ```

2. Append the option itself. `>>` adds a line to the end of the file instead of replacing it:

   ```bash
   echo 'set -g mouse on' >> ~/.tmux.conf
   ```

3. Load the file into the server that is already running. Press `C-b :` to open the command prompt, type the line below, and press Enter.

   ```text
   source ~/.tmux.conf
   ```

4. Check the option took effect on this server.

   ```bash
   tmux show-options -g mouse
   ```

   It reads `mouse on`.

5. Now prove the file loads by itself. Open the command prompt with `C-b :` and kill the server.

   ```text
   kill-server
   ```

   Your terminal drops back to the plain shell.

6. Start a fresh session. This is a new server, so it reads `~/.tmux.conf` before creating anything.

   ```bash
   tmux new -s learn
   ```

**Done when** `~/.tmux.conf` contains `set -g mouse on`, the option reads `on` on the running server, and after `kill-server` a new `tmux new -s learn` server has mouse already on without you sourcing anything.

## What just happened

Step 3's `source ~/.tmux.conf` ran the `source-file` command, which reads a file of tmux commands and executes each one against the current server, the same as if you had typed `set -g mouse on` yourself at the command prompt. This is how you test a configuration file without restarting anything.

`kill-server` in step 5 is the command from Level 1, Task 10; it shuts down the whole server, and with it every session, window and pane. Step 6's `tmux new -s learn` starts a brand new server. Before it creates the `learn` session, it runs `~/.tmux.conf` from the top, which is why `mouse` reads `on` immediately, with no `source` command from you. A session created inside a server that is already running, by contrast, never triggers this file at all, only a fresh server start does.

Two mistakes are common here. Using `>` instead of `>>` in step 1 or 2 overwrites the file instead of adding to it, so check the file's contents with `cat ~/.tmux.conf` if a line seems to have disappeared. And expecting a plain `C-b c` new window, or a second `tmux new -s other`, to reread the file: neither does, because the server is already running.

## Go further

- A typo in `.tmux.conf` makes tmux print an error line when the server starts, naming the bad line. Fix the file and either `:source ~/.tmux.conf` on the running server or `kill-server` and start again to check it.
- `source-file` can load any file, not just `.tmux.conf`, so you can keep separate files for separate machines and load whichever one applies.
- Editing the file with `open ~/.tmux.conf` works just as well as `echo >>`; either way the file is a plain list of commands, one per line. `open` puts the file in an editor over the terminal; save and close it to get your prompt back.
