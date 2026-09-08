---
title: "Embedded shell commands"
slug: "embedded-shell-commands"
summary: "Show the output of a shell command in the status line and control how often it refreshes."
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
objective: "Show the contents of ~/status.txt in status-right next to the time, refresh every 5 seconds, then change the file to FAILED and watch the bar update."
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
  - "An embedded shell command goes between `#(` and `)` inside an option value, the same place a format goes between `#{` and `}`."
  - "Set it with `set -g status-right '#(cat ~/status.txt) %H:%M'`. Keep the existing `%H:%M` so the clock stays."
  - "Set the refresh cap with `set -g status-interval 5`. Then edit the file: `echo FAILED > ~/status.txt`."
  - "If the bar looks cut off, the option is too long for `status-right-length`, the counterpart of the `status-left-length` you set in Level 4, Task 6."
---

Level 4, Task 6 put a format and a style into `status-right`. A format reads tmux's own state. To show anything else, a build result, a log line, a sensor reading, the status line needs to run a real shell command.

## Concept

An embedded command is shell command text wrapped in `#(` and `)` inside a status line option. tmux runs it and puts its output in the option's place. There are two forms. A command that prints one line and exits has that line shown until tmux reruns it. A command that stays running and prints a new line whenever it has one is shown as soon as that line arrives, for example a `while` loop with a `sleep` inside it.

For the first form, tmux does not rerun the command constantly. The `status-interval` option sets the maximum number of seconds between reruns, so a value of `5` means the command is checked at least every five seconds. tmux may also rerun it sooner, when the status line redraws for another reason, but never more than once a second.

You do not need an embedded command for the clock. tmux expands date-like formats such as `%H` and `%M` itself, directly in the option value, without invoking `date`. An embedded command is for output tmux has no other way to get. If a command such as `date` is used inside `#()` anyway, any `%` in its output must be doubled to `%%`, since a single `%` there would look like a format to tmux.

## Do this

1. Look at the file already on disk.

   ```bash
   cat ~/status.txt
   ```

   It reads `build: ok`.

2. Press `C-b :` to open the command prompt. Type the line below and press Enter. Keep the existing clock so both show.

   ```text
   set -g status-right '#(cat ~/status.txt) %H:%M'
   ```

   The right end of the status line now shows `build: ok` followed by the time.

3. Press `C-b :` again and cap the refresh interval.

   ```text
   set -g status-interval 5
   ```

4. From the pane, change the file the embedded command reads.

   ```bash
   echo 'FAILED' > ~/status.txt
   ```

5. Wait a few seconds without touching the keyboard. tmux reruns `cat ~/status.txt` on its own and the status line switches to `FAILED`.

**Done when** `status-right` runs `cat` on `status.txt`, `status-interval` is `5`, and `status.txt` reads `FAILED`.

## What just happened

`set-option -g status-right` now holds `#(cat ~/status.txt) %H:%M`. tmux ran the `cat` command once immediately, showed its one line of output, then reran it on the schedule `status-interval` sets. `%H:%M` next to it is not a command at all, tmux substitutes the hour and minute into the option text itself every time the status line redraws.

`status-interval` is a session option, listed in the wiki alongside `history-limit` and `status-position`: the maximum time in seconds before the status line is redrawn. Setting it to `5` bounds how stale the embedded command's output can get. tmux will still rerun it sooner if something else forces a redraw, such as a window changing, but never within one second of the last run.

Editing `status.txt` from the shell did not touch tmux at all. The next scheduled rerun of `#(cat ~/status.txt)` picked up the new line and replaced the old one, which is the point: the status line can track anything a shell command can read.

## Go further

- A command that stays running avoids the polling delay entirely: `'#(tail -f ~/status.txt)'` prints a new status line the moment the file gains a line, instead of waiting for the next interval.
- `status-left` accepts embedded commands the same way `status-right` does.
- If the file the command reads disappears or the command fails, tmux leaves the last good output in place rather than blanking the status line.
