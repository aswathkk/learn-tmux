# The guest machine

Real tmux, on a real Linux kernel, inside the browser. No server process, no
websocket, no container: the whole machine is an x86 emulator compiled to
WebAssembly.

```
xterm.js  ──serial console──  v86 (x86 → wasm)
                                 │
                                 ├── Linux 5.6 (buildroot bzImage, 5.2 MB)
                                 └── 9p filesystem  →  Alpine i386 + tmux (2.8 MB)
```

Everything here builds `public/vm/`, which is gitignored. The site does not need
any of it to build — only to run the terminal.

## Rebuilding

```bash
bun run guest:fetch    # v86, SeaBIOS, the kernel  (~8 MB, once)
bun run guest:build    # docker build of the Alpine rootfs → 9p filesystem
bun run guest:state    # snapshot it so the page starts instantly
```

`guest:build` needs Docker with `linux/386` emulation. `guest:fetch` and
`guest:build` are the only steps that touch the network.

**The snapshot goes stale.** It embeds 9p inode metadata, so `guest:state` has
to run after every `guest:build` or the guest wakes with a view of a filesystem
that no longer exists.

## Layout

| path | what |
| --- | --- |
| `Dockerfile` | the guest rootfs: Alpine i386 + tmux |
| `rootfs/` | files copied into that image (boot script and `open`) |
| `rootfs/v86-boot.sh` | remounts 9p with caching, mounts devpts and tmpfs, chroots |
| `rootfs/usr/local/bin/start-tmux` | first process in the chroot; starts the control shell |
| `rootfs/usr/local/bin/open` | hands a file to the browser's editor over the serial line |
| `tools/` | TypeScript ports of v86's `fs2json.py` and `copy-to-sha256.py` |
| `make-state.ts` | headless boot → `save_state()` snapshot |

## Four things that will bite you

**tmux needs devpts.** Mounting devtmpfs over the rootfs's `/dev` hides the
image's `/dev/pts`, and tmux then fails with `create window failed: fork failed`.
The mountpoint is recreated after devtmpfs is mounted.

**tmux needs a real filesystem for its socket.** 9p cannot host a unix domain
socket, so `/tmp` is a tmpfs and `TMUX_TMPDIR` points at it.

**9p has no cache by default.** The buildroot init mounts the share with caching
off, and v86 re-fetches the *whole file* per read that misses. Starting tmux
pulled 7.4 MB out of a 2.8 MB rootfs. `v86-boot.sh` remounts with `cache=loose`
before the chroot: one fetch per file.

**A serial line carries no SIGWINCH.** The page pushes the size in as a command
instead — `stty` on the current tty, plus `stty -F /dev/ttyS0` for the tty the
tmux client is attached to, which is what actually raises SIGWINCH.
(`tmux refresh-client -C` does not help: it only applies to control mode.)

## Guest facts the lessons depend on

- The session runs as an ordinary user, **`alpine`**, home `/home/alpine`.
  The home directory is empty and the login prints nothing: no banner, no
  guided-tour file. A lesson's first screen is a bare prompt.
- The shell is busybox `sh`, on host `learntmux`. Windows auto-rename to `sh`.
- **tmux runs with stock defaults**: window index 0, mouse off, default status
  line, and nothing whatsoever loaded from `~`. Every lesson starts from what a
  fresh tmux install actually gives you.
- tmux is 3.4 (Alpine 3.19). Two lessons that needed 3.7/3.8 were dropped, which
  is why level 3 has a gap in its task numbering.
