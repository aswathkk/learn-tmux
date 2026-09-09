---
title: "Write the configuration file"
slug: "tmux-conf-file"
summary: "Create ~/.tmux.conf, load it into the running server, then restart the server to see it load by itself."
seoDescription: 'Write your first ~/.tmux.conf, load it into the running server with source-file, then restart tmux and watch the file load by itself.'
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
objective: "`~/.tmux.conf` sets `mouse on`, and a fresh server starts with it on, unsourced."
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
  - "`>>` appends; `>` overwrites the file. If a line went missing, `cat ~/.tmux.conf` and check."
  - "A line starting with `#` is a comment. Add one, then `set -g mouse on` on its own line."
  - "Load it into the running server with `C-b :` then `source ~/.tmux.conf`. To see it load by itself, `:kill-server` then `tmux new -s learn`."
---

## Concept

`~/.tmux.conf` is a list of tmux commands, one per line, run when the server starts. `#` starts a comment. `source ~/.tmux.conf` at the prompt runs it against the server already running, so you can test without restarting.

The file runs only at server start, not when a session is created inside a running server. Anything you `set` by hand is gone when the server exits; anything in the file comes back every start.

It is not a shell script: `~` and quotes work, `$()` does not.

## Do this

1. Run `echo '# turn on mouse support' >> ~/.tmux.conf`.
2. Run `echo 'set -g mouse on' >> ~/.tmux.conf`.
3. Press `C-b :`, type `source ~/.tmux.conf`, Enter. `tmux show -g mouse` now prints `mouse on`.
4. Press `C-b :`, type `kill-server`, Enter. You drop to the plain shell.
5. Run `tmux new -s learn`. The new server read the file first: `tmux show -g mouse` prints `mouse on` with no sourcing.

## What just happened

`source-file` executed each line as if typed at the prompt. `kill-server` took the old server, and `tmux new` started a new one, which ran the file before creating `learn`. A second session in a running server never triggers the file; only a fresh server does.

## Go further

- A typo makes the new server print an error naming the line; fix it and `source` again.
- `source-file` loads any file, so per-machine settings can live in separate files.
- `open ~/.tmux.conf` edits the file in an editor over the terminal; save with Ctrl-S.
