---
title: "Embedded shell commands"
slug: "embedded-shell-commands"
summary: "Show the output of a shell command in the status line and control how often it refreshes."
seoDescription: 'Put the output of a shell command in the tmux status line with #(command), and decide how often it runs again with status-interval.'
level: 4
task: 7
difficulty: expert
estimatedMinutes: 3
concepts: [embedded-commands, status-interval, status-right]
keys:
  - key: ":set -g status-right '#(cmd)'"
    command: "embedded shell command in a status option"
    description: "Run a command and show its output, re-run at most every status-interval seconds"
  - key: ":set -g status-interval 5"
    command: "set-option -g status-interval"
    description: "Maximum seconds between status line refreshes"
wikiSections: ["Embedded commands", "List of useful options"]
challenge: false
objective: "`status-right` shows `cat ~/status.txt`, refreshed every 5 seconds, and the file now reads `FAILED`."
setup:
  - "echo 'build: ok' > /home/alpine/status.txt"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
startCommand: "tmux attach -t learn"
checks:
  - id: status-right-embedded
    description: "status-right contains an embedded command that cats status.txt"
    kind: tmux
    command: "show-options -gv status-right"
    expect: "#\\(cat"
  - id: status-interval-five
    description: "status-interval is set to 5 seconds"
    kind: tmux
    command: "show-options -gv status-interval"
    expect: "^5$"
  - id: status-file-changed
    description: "status.txt now reads FAILED, so the status line has something new to show"
    kind: shell
    command: "cat /home/alpine/status.txt"
    expect: "FAILED"
hints:
  - "Keep `%H:%M` in the value so the clock stays: `set -g status-right '#(cat ~/status.txt) %H:%M'`."
  - "`#(...)` runs a shell command where `#{...}` would read a format."
  - "`set -g status-interval 5`, then `echo FAILED > ~/status.txt` and wait a few seconds."
---

## Concept

`#(command)` inside a status option runs a shell command and shows its output. tmux reruns it at most every `status-interval` seconds, so `set -g status-interval 5` keeps it fresh. Formats like `%H:%M` need no command.

A command that prints one line and exits is shown until the next rerun. A command that keeps running, like a `while` loop with `sleep`, updates the bar each time it prints. Reruns happen at most once a second and at least every `status-interval`.

`%` in a command's output must be doubled to `%%`, or tmux reads it as a date code.

## Do this

1. Press `C-b :`, type `set -g status-right '#(cat ~/status.txt) %H:%M'`, Enter. The bar's right end reads `build: ok` and the time.
2. Press `C-b :`, type `set -g status-interval 5`, Enter.
3. Run `echo 'FAILED' > ~/status.txt`. Within five seconds the bar reads `FAILED`.

## What just happened

tmux ran `cat` once immediately, then on the interval. Editing the file never touched tmux; the next scheduled rerun read the new line. The clock next to it is expanded by tmux itself on every redraw.

## Go further

- `'#(tail -f ~/status.txt)'` stays running and updates the moment the file gains a line.
- `status-left` takes embedded commands the same way.
- If the command fails, tmux leaves the last good output in place.
