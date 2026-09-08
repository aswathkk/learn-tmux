---
title: "Change the prefix key"
slug: "change-the-prefix-key"
summary: "Move the prefix to C-a in the configuration file, unbind C-b, and make C-a C-a send the key through."
level: 4
task: 4
difficulty: expert
estimatedMinutes: 4
concepts: [prefix, send-prefix, prefix-option]
keys:
  - key: ":set -g prefix C-a"
    command: "set-option -g prefix"
    description: "Change the prefix key"
  - key: ":bind C-a send-prefix"
    command: "bind-key C-a send-prefix (with unbind C-b)"
    description: "Pressing the prefix twice sends it to the program"
wikiSections: ["Changing the prefix key", "Common configuration changes", "The prefix key"]
challenge: false
objective: "Make C-a the prefix from ~/.tmux.conf, source it, and open a new window with C-a c to prove it works."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
startCommand: "tmux attach -t learn"
checks:
  - id: prefix-is-c-a
    description: "The prefix option is set to C-a"
    kind: tmux
    command: "show-options -gv prefix"
    expect: "^C-a$"
  - id: c-a-sends-prefix
    description: "C-a is bound in the prefix table to send-prefix"
    kind: tmux
    command: "list-keys -T prefix C-a"
    expect: "send-prefix"
  - id: c-b-unbound
    description: "C-b is no longer bound in the prefix table"
    kind: shell
    command: "tmux list-keys -T prefix C-b >/dev/null 2>&1 && echo bound || echo unbound"
    expect: "^unbound$"
  - id: new-window-opened
    description: "A second window exists in session learn, opened with the new prefix"
    kind: tmux
    command: "display-message -p -t learn '#{session_windows}'"
    expect: "^2$"
hints:
  - "The wiki gives this exact recipe under Common configuration changes: three lines in `~/.tmux.conf`."
  - "The lines are `set -g prefix C-a`, `unbind C-b`, `bind C-a send-prefix`, in that order. Use `open ~/.tmux.conf` to write them, then save and close the editor."
  - "Source the file with `C-b :` then `source-file ~/.tmux.conf` (Level 4, Task 2), or run it once more with `C-a :` after the prefix has changed."
  - "Once the file is sourced, the prefix key is `C-a`, not `C-b`. Open a new window with `C-a c`, the same command you know from Level 1, Task 2."
---

So far the prefix has always been `C-b`, which the wiki lists as a default rather than a fixture. The `prefix` option controls it, and you can set it to any key you like.

## Concept

The prefix key is not special to tmux's key parser. It is an ordinary key bound, in the prefix key table, to a command that reads the next key press and looks it up in that same table. Which key does this job is stored in one option: `prefix`. Changing `prefix` changes the key tmux waits for, nothing else.

`C-b` also carries a second binding you have relied on without naming it: in the prefix table, `C-b` is bound to `send-prefix`, so pressing it twice sends a literal `C-b` to the program in the active pane instead of running a tmux command. That binding is tied to the key `C-b`, not to the `prefix` option, so changing `prefix` alone does not move it.

To replace `C-b` with `C-a`, the wiki's recipe under Common configuration changes has three lines: set the option, remove the old `send-prefix` binding, and add a new one for the new key. `C-a` is a deliberate choice for this course: it is also the shell's beginning-of-line key (Emacs bindings), which is exactly why a `send-prefix` binding matters once `C-a` becomes the prefix.

## Do this

1. Open `/home/alpine/.tmux.conf` with `open ~/.tmux.conf`. It already has one line, a comment.
2. Add these three lines, in this order, then save and quit with `:wq`.

   ```text
   set -g prefix C-a
   unbind C-b
   bind C-a send-prefix
   ```

3. Load the file. Press `C-b :` one last time, type `source-file ~/.tmux.conf`, then press Enter. Nothing visibly changes.
4. From this point on, the prefix is `C-a`. Press `C-a c`. A new window opens, numbered 1.
5. Check the window list at the bottom: `0:shell*` is gone from the active mark, replaced by `1:shell*`.

**Done when** `~/.tmux.conf` sets the prefix to `C-a`, `C-b` no longer sends any tmux command, `C-a` sends the prefix through when pressed twice, and a second window exists in session `learn`.

## What just happened

`set -g prefix C-a` changes the server option `prefix`, so tmux now waits for `C-a` after every key press instead of `C-b`. `unbind C-b` removes the `send-prefix` binding from the prefix table; without this line `C-b` would still be bound there even though it is no longer the prefix, and pressing prefix then `C-b` would send a literal `C-b` for no reason. `bind C-a send-prefix` gives the new prefix key the same escape hatch: press `C-a` twice and the second one goes straight to the shell, exactly like `C-b C-b` did in Level 1.

Sourcing the file with `source-file` applied all three lines at once, in the same session, without restarting anything. `C-a c` then ran `new-window`, the same command `C-b c` always ran; only the key that reaches it changed.

If you source the file after typing only the first line, the prefix moves to `C-a` before `send-prefix` is rebound: harmless, just source it again once the third line is saved.

## Go further

- The three lines can be typed once at the command prompt (`C-b :` before the change, `C-a :` after) to test a new prefix before writing it to the file.
- Many tmux users keep `C-a` permanently and add `bind C-b send-prefix` as well, so both keys work during the transition.
- `show-options -gv prefix` from the shell (`tmux show-options -gv prefix`) confirms the current prefix without attaching.
