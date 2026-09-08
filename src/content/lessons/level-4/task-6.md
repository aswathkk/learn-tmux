---
title: "Formats and embedded styles"
slug: "formats-and-styles"
summary: "Rebuild status-left with a format variable, an embedded style and a conditional that lights up when the prefix is pressed."
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
objective: "Set status-left to show a red P while the prefix is pressed followed by the session name in a colour, and make status-left-length at least 30."
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
  - "Edit `#{session_name}` in Task 5's status-left, and add an embedded style before it: `#[fg=cyan]#{session_name}#[default]`."
  - "A conditional format is `#{?condition,if-true,if-false}`. `client_prefix` is `1` while the prefix is held, so `#{?client_prefix,#[fg=red],#[fg=green]}` switches the style of the text that follows it."
  - "Put `P` after the conditional and `#[default]` after `P` to stop the red or green from bleeding into the rest of the line, then append `#{session_name}` in its own colour."
  - "The full wiki example is `set -g status-left '#{?client_prefix,#[bg=red],}P#[default] [#{session_name}] '`. Write it to `~/.tmux.conf`, then `set -g status-left-length 40` too, and run `:source ~/.tmux.conf`."
---

Task 5 put fixed colours on the status line. This task makes a piece of it change colour by itself, based on whether you are holding the prefix right now.

## Concept

A format is a small piece of syntax that expands to an attribute of the server, a session, a window or a pane. Formats appear inside `#{}` in string options, or as a single uppercase letter such as `#F`. `#{session_name}` is a format: it expands to the name of the session the status line belongs to. Formats can also branch: `#{?condition,a,b}` expands to `a` if `condition` is true (non-zero, non-empty) and to `b` otherwise. `client_prefix` is a format that is `1` while a client is waiting for a key after the prefix, and `0` the rest of the time.

A style sets the colour and attributes of text. Styles appear in style options such as `status-style`, using terms like `fg=red` or `bg=blue` separated by spaces or commas. A style can also be embedded directly inside another option's value, enclosed in `#[` and `]`. An embedded style changes the style of the text that follows it until the next embedded style, or until `#[default]` resets it to the option's default style.

Putting a conditional format around an embedded style is how the status line reacts to what you are doing: `#{?client_prefix,#[fg=red],#[fg=green]}` picks one embedded style or the other depending on `client_prefix`, and the text right after it is drawn in whichever style won.

## Do this

1. At the shell prompt, open the configuration file.

   ```bash
   open /home/alpine/.tmux.conf
   ```

2. Add a line that rebuilds `status-left` with a conditional embedded style, a letter, a reset, and the session name in its own colour.

   ```text
   set -g status-left '#{?client_prefix,#[fg=red],#[fg=green]}P#[default] #[fg=cyan]#{session_name}#[default] '
   ```

3. On the next line, allow the longer value to display in full.

   ```text
   set -g status-left-length 40
   ```

4. Save and close the editor.

5. Back at the shell prompt, attach and source the file.

   ```bash
   tmux attach -t learn
   ```

   Then press `C-b :`, type `source ~/.tmux.conf`, and press Enter.

6. Look at the left end of the status line. It shows a green `P` followed by the session name in cyan.

7. Press and hold `C-b`. While you hold it, `P` turns red. Release it and `P` goes back to green.

**Done when** `status-left` contains an embedded style and a `client_prefix` conditional, and `status-left-length` is at least 30.

## What just happened

`set-option -g status-left` replaced the whole value with a string built from three pieces: a conditional format, a literal `P`, and `#{session_name}` behind its own embedded style. `#{?client_prefix,#[fg=red],#[fg=green]}` is evaluated every time the status line redraws. While you hold the prefix, `client_prefix` is `1`, so the format expands to `#[fg=red]`; the rest of the time it expands to `#[fg=green]`. Either way, an embedded style is now sitting in the text, changing the colour of the `P` that comes right after it.

`#[default]` after `P` stops that colour from carrying into the rest of the line, and the second `#[fg=cyan]` starts a fresh embedded style for `#{session_name}`. Without `status-left-length`, tmux would truncate this longer value back down to its old width; setting it to `40` gives the whole string room.

You checked earlier in this level that `show-options -gv status-left` prints the raw value with its formats intact, unexpanded. That is exactly how you can read back any status-line option to see what it contains, and it is also how this course's own checks read your configuration.

## Go further

- `display-message -p '#{session_name} #{window_index}'` expands any format immediately, without touching an option. It is the fastest way to try a format before putting it in `.tmux.conf`.
- `show -gv status-right` prints the default `status-right`, which already uses a conditional format for the pane title width.
- A style term can also be `bg=` instead of `fg=`, so `#{?client_prefix,#[bg=red],#[bg=default]}` highlights the background instead of the letter's colour.
