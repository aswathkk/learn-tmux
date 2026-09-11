---
title: "Change the prefix key"
slug: "change-the-prefix-key"
summary: "Move the prefix to C-a in the configuration file, unbind C-b, and make C-a C-a send the key through."
seoDescription: 'Move the tmux prefix key to C-a in your config, unbind C-b, and bind C-a C-a to send-prefix so the key still reaches the program below.'
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
objective: "The prefix is `C-a`, `C-b` is unbound, and a window was opened with `C-a c`."
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
  - "After sourcing, the prefix is `C-a`. Opening the new window is `C-a c`, not `C-b c`."
  - "Three lines: `set -g prefix C-a`, `unbind C-b`, `bind C-a send-prefix`, in that order."
  - "`open ~/.tmux.conf`, add them, Ctrl-S. Then `C-b :` one last time and `source ~/.tmux.conf`."
---

## Concept

Moving the prefix takes three lines, and each one does a different job:

- `set -g prefix C-a` — tell tmux which key to wait for
- `unbind C-b` — drop the old key's now-stale binding
- `bind C-a send-prefix` — so pressing `C-a` twice still sends a real `C-a` through

One line is not enough because the `prefix` option only changes *which key tmux watches*. It does not move the `send-prefix` binding, which was attached to `C-b` itself.

That third line earns its place here: `C-a` is the shell's beginning-of-line key, so without an escape hatch you lose it.

## What makes the prefix special

The prefix is an ordinary key with one job: read the next key and look it up in the `prefix` table. Nothing else about it is special.

## Do this

1. Run `open ~/.tmux.conf`, add these lines, and save with Ctrl-S:

   ```text
   set -g prefix C-a
   unbind C-b
   bind C-a send-prefix
   ```

2. Press `C-b :` one last time, type `source ~/.tmux.conf`, Enter.

   Nothing visible changes — but `C-b` is now inert.

3. Press `C-a c`.

   A second window opens: the list reads `0:shell- 1:sh*`.

## What just happened

`set -g prefix C-a` made tmux wait for `C-a`. `unbind C-b` removed the stale `send-prefix` binding, and `bind C-a send-prefix` gave the new key the same escape hatch, so `C-a C-a` reaches the shell. Sourcing applied all three at once; `C-a c` then ran the same `new-window` that `C-b c` always did.

## Go further

- Test a prefix without the file: type the three commands at the prompt, using `C-b :` before and `C-a :` after.
- Many people keep both keys during the transition with `bind C-b send-prefix` as well.
- `tmux show -gv prefix` from the shell prints the current prefix.
