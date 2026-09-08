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
bun run guest:publish  # push public/vm/ to R2, where production reads it
```

`guest:build` needs Docker with `linux/386` emulation. `guest:fetch` and
`guest:build` are the only steps that touch the network.

`guest:state` writes the snapshot twice: `public/vm/state.bin.zst`, which is the
only one the browser ever asks for, and an uncompressed `guest/build/state.bin`
for local inspection. The raw copy is 28 MB and deliberately lives outside
`public/`, so it is never deployed.

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
| `publish.sh` | upload `public/vm/` to the R2 bucket |

## Serving it

`astro dev` serves `public/vm/` straight off disk, so local work needs nothing
else. Production does not: `/vm/*` is a Pages Function reading from R2.

```
public/vm/  ──guest:publish──▶  r2://learntmux/vm/
                                        │
    browser  ──GET /vm/…──▶  functions/vm/[[path]].ts
```

The machine is 22 MB that changes on its own schedule, and the site is 2.4 MB
that changes constantly. Splitting them means a typo fix in a lesson no longer
re-uploads the emulator, and a rebuilt rootfs no longer needs a site deploy.
[`public/_routes.json`](../public/_routes.json) sends only `/vm/*` through the
Function; everything else stays a plain static asset.

Because a Pages Function takes precedence over a static asset at the same path,
shipping `public/vm/` in the build would upload 22 MB per deploy that nothing
could ever reach — so `astro.config.mjs` drops `dist/vm/` on the way out. That
also means `astro preview` has no guest. Build with `KEEP_VM_ASSETS=1` when you
need one.

[`functions/vm/[[path]].ts`](../functions/vm/[[path]].ts) is the whole policy,
and nothing in `_headers` applies to a path it owns. Two of the headers it sets
are about correctness rather than caching: `application/wasm` on `v86.wasm`, or
the browser buffers all 2.1 MB before compiling; and no `Content-Encoding` on
`state.bin.zst`, which libv86 inflates itself and would otherwise be handed
already inflated under a name that makes it try again.

The caching split is the same one the blobs themselves imply. `rootfs/` is
content-addressed, so those 90 files are `immutable`. The other seven are one
coupled generation — a snapshot served stale beside a rebuilt `rootfs/` is
exactly the failure above — so they revalidate every load, which costs one
round trip and answers 304 rather than re-sending 12.5 MB.
