---
title: "Formats and embedded styles"
slug: "formats-and-styles"
summary: "Rebuild status-left with a format variable, an embedded style and a conditional that lights up when the prefix is pressed."
seoDescription: 'Rebuild the tmux status-left from format variables like #{session_name}, an embedded #[fg=...] style, and a conditional watching the prefix.'
level: 4
task: 6
difficulty: expert
estimatedMinutes: 4
concepts: [formats, embedded-styles, conditionals, status-left]
keys:
  - key: ":set -g status-left '#{session_name}'"
    command: "set-option -g status-left with #{...} formats and #{?cond,a,b} conditionals"
    description: "Formats expand attributes of the server, session, window or pane"
  - key: ":#[fg=red]"
    command: "embedded style inside an option value"
    description: "Change the style of the following text until the next #[...]; #[default] resets"
  - key: ":set -g status-left-length 40"
    command: "set-option -g status-left-length"
    description: "Allow a longer status-left"
wikiSections: ["Formats", "Embedded styles", "Colours and styles", "List of style and format options"]
challenge: false
objective: "`status-left` shows a `P` that turns red while the prefix is held, then the session name."
setup:
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "echo '# my tmux config' > /home/alpine/.tmux.conf"
startCommand: "tmux attach -t learn"
checks:
  - id: status-left-has-embedded-style
    description: "status-left contains an embedded style, which the default does not"
    kind: tmux
    command: "show-options -gv status-left"
    expect: "#\\[fg="
  - id: status-left-has-conditional
    description: "status-left contains a conditional on client_prefix"
    kind: tmux
    command: "show-options -gv status-left"
    expect: "client_prefix"
  - id: status-left-length-increased
    description: "status-left-length is at least 30"
    kind: tmux
    command: "show-options -gv status-left-length"
    expect: "^([3-9][0-9]|[1-9][0-9]{2})$"
hints:
  - "Do not run `tmux attach` again; you are already attached. Load the file with `C-b :` then `source ~/.tmux.conf`."
  - "A conditional is `#{?condition,if-true,if-false}`. `client_prefix` is `1` while the prefix is held, so `#{?client_prefix,#[fg=red],#[fg=green]}` picks a style."
  - "Put `P` after the conditional and `#[default]` after `P`, then the session name in its own colour. Set `status-left-length 40` too."
  - "Full line: `set -g status-left '#{?client_prefix,#[fg=red],#[fg=green]}P#[default] #[fg=cyan]#{session_name}#[default] '`."
---

## Concept

A format, `#{session_name}`, expands to a value; a conditional, `#{?client_prefix,a,b}`, picks `a` while the prefix is held and `b` otherwise. An embedded style, `#[fg=red]`, colours the text after it until `#[default]`. Put them in `status-left` and the bar reacts to you.

Formats read the server's state: session, window, pane and client attributes. `client_prefix` is `1` only while a client waits for the key after the prefix. A conditional is true when its value is non-zero and non-empty.

`status-left-length` caps how much of the value is drawn; the default is too short for this one.

## Do this

1. Run `open ~/.tmux.conf`. Add these lines and save with Ctrl-S:

   ```text
   set -g status-left '#{?client_prefix,#[fg=red],#[fg=green]}P#[default] #[fg=cyan]#{session_name}#[default] '
   set -g status-left-length 40
   ```

2. Press `C-b :`, type `source ~/.tmux.conf`, Enter. The bar starts with a green `P` and `learn` in cyan.
3. Press and hold `C-b`. `P` turns red; release, and it is green again.

## What just happened

The bar redraws on every change, and each redraw re-evaluates the conditional: `client_prefix` flips to `1` while you hold the prefix, so the format expands to `#[fg=red]`. `#[default]` after `P` stops the colour bleeding into the rest, and `status-left-length 40` gave the longer value room.

## Go further

- `display-message -p '#{session_name} #{window_index}'` expands a format on the spot, to test one before it goes in the file.
- `show -gv status-right` shows the default right side, which already uses a conditional for the pane title width.
- `bg=` works in embedded styles too: `#{?client_prefix,#[bg=red],#[bg=default]}`.
