---
title: "Name, save and load buffers"
slug: "name-save-and-load-buffers"
summary: "Rename an automatic buffer, save it to a file and load a file into a named buffer from the command prompt."
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
objective: "Rename buffer0 to key, save it to ~/key.txt, and load ~/motd.txt into a buffer named motd."
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
  - "Everything here runs from the command prompt: press `C-b :` first, type the command, then press Enter."
  - "Renaming is `setb -b buffer0 -n key`. The `-b` flag names the buffer that already exists, `-n` gives it its new name."
  - "Saving is `saveb -b key ~/key.txt`. Loading is `loadb -b motd ~/motd.txt`: `-b` here names the buffer being created."
  - "Check with `C-b =`: the buffer list should show `key` and `motd` instead of `buffer0`."
---

Automatic buffers are numbered and get pushed out once 50 pile up. A named buffer never gets deleted that way, so before you save something worth keeping, give it a name.

## Concept

`set-buffer` changes a paste buffer's contents or its name. With `-b` it targets an existing buffer; with `-n` it gives that buffer a new name. Naming a buffer this way turns an automatic buffer, such as `buffer0`, into a named buffer. `set-buffer` can also create a buffer directly: `-b` names it and the remaining argument is the text to store.

`save-buffer` writes a buffer's contents to a file, and `load-buffer` does the reverse, reading a file into a buffer. Both take `-b` to name the buffer involved. Without `-b`, `set-buffer` or `load-buffer` creates a new automatic buffer instead of naming one.

All three commands are typed at the command prompt, opened with `C-b :`. At the prompt, `~` expands to the home directory, so `~/key.txt` and `/home/alpine/key.txt` mean the same file.

## Do this

1. Press `C-b :` to open the command prompt.
2. Type `setb -b buffer0 -n key` and press Enter. This renames `buffer0` to `key`; its text does not change.
3. Press `C-b :` again and type `saveb -b key ~/key.txt`, then press Enter. The buffer named `key` is written to that file.
4. Press `C-b :` and type `loadb -b motd ~/motd.txt`, then press Enter. The file is read into a new buffer named `motd`.
5. Press `C-b =` to open buffer mode. The list shows `key` and `motd`, not `buffer0`. Press `q` to close it.

**Done when** the buffer is renamed from `buffer0` to `key`, its text is saved to `~/key.txt`, and `~/motd.txt` has been loaded into a buffer named `motd`.

## What just happened

`setb -b buffer0 -n key` ran `set-buffer` with two flags: `-b buffer0` picked the existing automatic buffer, and `-n key` renamed it. The text inside was untouched, only the name changed, so `buffer0` no longer appears in the list; `key` does, still holding the same copied text.

`saveb -b key ~/key.txt` ran `save-buffer -b`, which wrote the named buffer's contents straight to that path. `loadb -b motd ~/motd.txt` ran `load-buffer -b`, the opposite direction: it read the file and stored it as a new buffer called `motd`, without touching any pane.

The wiki's short forms drop the space between a flag and its argument, so `setb -bbuffer0 -nkey` and `setb -b buffer0 -n key` run the same command. Renaming before saving matters: if you saved `buffer0` first and renamed it afterward, the save would still have worked, since `save-buffer` only needs the name at the time it runs, but relying on the automatic name is fragile once several copies have happened and the numbering has shifted.

## Go further

- `setb -b foo bar` creates a brand new named buffer `foo` holding the text `bar`, with no copying involved.
- `loadb ~/somefile` without `-b` creates another automatic buffer instead of a named one.
- Command sequences chain these on one line with `;`, for example `setb -b buffer0 -n key ; saveb -b key ~/key.txt`.
