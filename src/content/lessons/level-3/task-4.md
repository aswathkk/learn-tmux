---
title: "Name, save and load buffers"
slug: "name-save-and-load-buffers"
summary: "Rename an automatic buffer, save it to a file and load a file into a named buffer from the command prompt."
seoDescription: 'Name a tmux paste buffer with set-buffer, write it out to a file with save-buffer, and read a file back into a buffer with load-buffer.'
level: 3
task: 4
difficulty: advanced
estimatedMinutes: 3
concepts: [set-buffer, save-buffer, load-buffer, named-buffers]
keys:
  - key: ":setb -b old -n new"
    command: "set-buffer -b -n"
    description: "Rename a buffer, turning an automatic buffer into a named one; setb -b name text creates one"
  - key: ":saveb -b name path"
    command: "save-buffer -b"
    description: "Write a buffer's contents to a file"
  - key: ":loadb -b name path"
    command: "load-buffer -b"
    description: "Read a file into a buffer with the given name"
wikiSections: ["Copy and paste", "The command prompt"]
challenge: false
objective: "`buffer0` is renamed `key` and saved to `~/key.txt`; `~/motd.txt` is loaded as buffer `motd`."
setup:
  - "printf 'welcome to the build box' > /home/alpine/motd.txt"
  - "tmux new-session -d -s learn -n shell -x 120 -y 36"
  - "tmux set-buffer 'deploy-key-7f3a9c2e'"
startCommand: "tmux attach -t learn"
checks:
  - id: buffer-renamed
    description: "buffer0 has been renamed to key and still holds the copied text"
    kind: tmux
    command: "list-buffers -F '#{buffer_name}=#{buffer_sample}'"
    expect: "^key=deploy-key-7f3a9c2e$"
  - id: key-file-written
    description: "The key buffer was saved to ~/key.txt"
    kind: shell
    command: "cat /home/alpine/key.txt"
    expect: "deploy-key-7f3a9c2e"
  - id: motd-buffer-loaded
    description: "motd.txt was loaded into a buffer named motd"
    kind: tmux
    command: "list-buffers -F '#{buffer_name}=#{buffer_sample}'"
    expect: "^motd=welcome"
hints:
  - "Everything here is typed at `C-b :`. `-b` names the buffer the command works on."
  - "Rename: `setb -b buffer0 -n key`. Save: `saveb -b key ~/key.txt`."
  - "Load: `loadb -b motd ~/motd.txt`. `C-b =` should then list `key` and `motd`."
---

## Concept

At the prompt, `setb -b old -n new` renames a buffer, `saveb -b name path` writes it to a file, and `loadb -b name path` reads a file into a named buffer. Naming a buffer stops it being dropped when automatic buffers pile past 50.

`set-buffer -b name text` can also create a buffer outright. Without `-b`, `set-buffer` and `load-buffer` make a new automatic buffer. `~` expands at the prompt, so `~/key.txt` is `/home/alpine/key.txt`.

## Do this

1. Press `C-b :`, type `setb -b buffer0 -n key`, Enter.
2. Press `C-b :`, type `saveb -b key ~/key.txt`, Enter.
3. Press `C-b :`, type `loadb -b motd ~/motd.txt`, Enter.
4. Press `C-b =`. The list shows `key` and `motd`, no `buffer0`. Press `q`.

## What just happened

Only the name changed in step 1; the text stayed. `save-buffer` wrote that text to disk and `load-buffer` did the reverse into a fresh buffer, without touching any pane. Renaming first means the save does not depend on which number the buffer happens to have.

## Go further

- `setb -b foo bar` creates named buffer `foo` holding `bar` with no copying.
- Chain them on one line: `setb -b buffer0 -n key ; saveb -b key ~/key.txt`.
