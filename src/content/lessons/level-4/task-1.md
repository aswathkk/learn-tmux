---
title: "Show, set and unset options"
slug: "show-set-and-unset-options"
summary: "Read option values of each type, set a server option and a session option, watch renumbering happen, and unset one back to its default."
level: 4
task: 1
difficulty: expert
estimatedMinutes: 4
concepts: [options, option-types, show-options, set-option, unset]
keys:
  - key: ":show -g option"
    command: "show-options -g (show -s server, show -wg window)"
    description: "Show a global option; without a name lists all options of that type"
  - key: ":set -g option value"
    command: "set-option -g"
    description: "Set a global session or window option (server options need no -g; -s marks them)"
  - key: ":set -gu option"
    command: "set-option -gu"
    description: "Unset a global option, restoring its default"
wikiSections: ["Types of option", "Showing options", "Changing options", "List of useful options"]
challenge: false
objective: "Set escape-time to 10, turn renumber-windows on and kill the middle window to see the list close up, then unset status-position so the status line returns to the bottom."
setup:
  - "tmux new-session -d -s learn -n editor -x 120 -y 36"
  - "tmux new-window -d -t learn -n scratch"
  - "tmux new-window -d -t learn -n logs"
  - "tmux set-option -g status-position top"
startCommand: "tmux attach -t learn"
checks:
  - id: escape-time-set
    description: "The server option escape-time is 10"
    kind: tmux
    command: "show-options -sv escape-time"
    expect: "^10$"
  - id: renumber-on
    description: "The global session option renumber-windows is on"
    kind: tmux
    command: "show-options -gv renumber-windows"
    expect: "^on$"
  - id: windows-closed-up
    description: "Killing window 1 (scratch) left windows 0 and 1 with no gap"
    kind: shell
    command: "tmux list-windows -t learn -F '#{window_index}' | tr '\\n' ','"
    expect: "^0,1,$"
  - id: status-position-default
    description: "status-position is back to its default, bottom"
    kind: tmux
    command: "show-options -gv status-position"
    expect: "^bottom$"
hints:
  - "Open the prompt with `C-b :`. Everything below is typed there, then Enter."
  - "`show -g name` reads an option, `set -g name value` writes it. You don't need `-s` or `-w` when you give a name; tmux works out the type."
  - "Turn `renumber-windows` on first, then `kill-window -t learn:1`. The list closes the gap by itself."
  - "The last step is `set -gu status-position`. The `-u` unsets it, no value needed."
---

Every part of tmux you have used so far, the prefix, the status line, key bindings, is controlled by an option. This task shows you how to read and change them directly, which is what a `.tmux.conf` does under the hood.

## Concept

tmux is configured by setting options, and there are several types: server options affect the whole server, session options affect one or all sessions, window options affect one or all windows, pane options work the same way for panes, and user options are reserved for you and unused by tmux itself. Session and window options each have a global set plus a set for the specific session or window; when an option is missing from the specific set, tmux falls back to the global one.

You show an option with `show-options`, or `show` for short. `-s` shows server options, `-g` alone shows global session options, and `-g` with `-w` shows global window options. Giving a specific option name to `show-options` makes `-s` and `-w` unnecessary: tmux looks up the name and knows its type.

`set-option`, or `set`, works the same way. `-g` is needed to change a global session or window option; for a server option it does nothing, since server options have no per-session or per-window copy to override. The `-u` flag unsets an option. Unsetting a global option restores its default value.

## Do this

1. Open the command prompt with `C-b :` and check the status line's current position.

   ```text
   show -g status-position
   ```

   It reads `top`, which is why the status line is at the top of your screen right now.

2. Open the prompt again and set the server option `escape-time` to 10 milliseconds.

   ```text
   set -s escape-time 10
   ```

   No output appears; the prompt just closes. `-s` marks it as a server option, though tmux would infer that from the name alone.

3. Open the prompt and turn on `renumber-windows`, a session option.

   ```text
   set -g renumber-windows on
   ```

4. Look at the window list in the status line: `0:editor* 1:scratch 2:logs`. Open the prompt and kill window 1.

   ```text
   kill-window -t :1
   ```

5. Read the window list again. It now shows `0:editor* 1:logs`: window 2 moved down to close the gap left by window 1, because `renumber-windows` is on.

6. Open the prompt one more time and unset `status-position`.

   ```text
   set -gu status-position
   ```

   The status line jumps back down to the bottom, its default position.

**Done when** `escape-time` is 10, `renumber-windows` is on, killing window 1 left the list as `0` and `1` with no gap, and `status-position` is back to `bottom`.

## What just happened

`set -s escape-time 10` changed a server option, so it applies to every session on this server, not just `learn`. `set -g renumber-windows on` changed a global session option: `-g` was required here, because without it `set-option` would only try to override the value for whichever session was current, and `renumber-windows` has no per-session override to set.

With `renumber-windows on`, `kill-window` did more than remove window 1. tmux renumbered every window after the gap so the indexes stay contiguous starting at 0, turning `0, 1, 2` into `0, 1`. Without that option, killing window 1 would have left a hole and window 2 would have kept its index.

`set -gu status-position` shows what `-u` does: it removes your override of the global option, and the option reverts to the default that shipped with tmux, `bottom`. Unsetting is different from setting a value yourself; there is no need to remember what the default was.

## Go further

- `show -s` with no name lists every server option, and `show -g` or `show -wg` do the same for global session or window options; pipe to `less` if the pane is not tall enough.
- `escape-time` exists because tmux has to tell an `Escape` keypress apart from the start of a longer escape sequence (arrow keys, function keys); 10ms is a common low-latency setting for local terminals.
- `synchronize-panes`, also set with `set -g`, sends everything you type to every pane in the window at once. The wiki calls this out for special care, since a stray command goes everywhere.
- `base-index`, a session option, changes where window numbering starts. Level 4's challenge task puts it to use.
