![learntmux — 42 tasks, one real terminal. tmux, in minutes.](https://assets.learntmux.dev/banner.png)

# learntmux

Learn tmux by doing it, not reading about it — four levels, 42 hands-on tasks,
one real terminal in the browser. Live at [learntmux.dev](https://learntmux.dev).

The terminal is not a simulation. Every lesson runs against real tmux 3.4 on a
real Linux kernel, inside an x86 emulator compiled to WebAssembly, with no
server behind it. The lesson's checks are graded by running tmux commands
against that machine on a side channel the learner never sees.

Built with [Astro](https://astro.build), Tailwind CSS and
[v86](https://github.com/copy/v86).

## Getting started

```bash
bun install
bun run dev          # localhost:4321
```

The site builds and runs without the guest machine. The terminal will fail to
start until you build it once — see [guest/README.md](guest/README.md):

```bash
bun run guest:fetch  # v86, SeaBIOS, the kernel (~8 MB, once)
bun run guest:build  # Docker build of the Alpine rootfs → 9p filesystem
bun run guest:state  # snapshot it so the page starts in ~0.4 s
```

## Project structure

```text
/
├── guest/                  # the machine in the browser (not shipped to the site)
│   ├── Dockerfile          #   Alpine i386 + tmux
│   ├── rootfs/             #   files copied into that image: boot script and `open`
│   ├── tools/              #   TypeScript ports of v86's fs2json / copy-to-sha256
│   └── make-state.ts       #   headless boot → snapshot
├── public/
│   └── vm/                 # gitignored build output the browser fetches (~22 MB)
├── src/
│   ├── content/
│   │   ├── lessons/        # 42 tasks, level-N/task-M.md, validated against the harness schema
│   │   ├── guides/         # every article: setup, workflow, config, remote
│   │   └── configs/        # the tmux.conf gallery, one directory per entry
│   ├── lib/
│   │   ├── vm/             # emulator, serial, control channel, terminal, editor
│   │   ├── harness/        # the lesson contract, staging and grading
│   │   ├── lessons.ts      # ordering, routes, navigation, course totals
│   │   ├── cheatsheet.ts   # derived from lesson `keys` — never authored
│   │   └── seo.ts          # structured data
│   ├── components/
│   │   ├── learn/          # the two-column learn screen
│   │   ├── landing/        # the scroll-driven landing page
│   │   ├── ui/             # header, footer, breadcrumbs, keycaps
│   │   └── seo/
│   ├── layouts/            # Base, Learn, Article
│   ├── pages/
│   └── scripts/learn.ts    # wires the machine and harness to the learn screen
├── docs/
│   ├── banner.png          # the README banner
│   └── banner-src/         # the HTML it renders from, plus `render.sh`
└── scripts/content-index.mjs # lesson slugs + authored dates, for the sitemap
```

## How a lesson works

A lesson is one markdown file. Its frontmatter is a contract validated at build
time by `src/lib/harness/types.ts`, so a lesson that builds is a lesson the
harness can run:

```yaml
setup:        # commands staged on the control channel, invisible to the learner
startCommand: # typed into the learner's terminal
checks:       # tmux or shell commands, each with an `expect` regular expression
hints:        # revealed one at a time
keys:         # what it teaches — these become the cheat sheet
```

Picking a task restores an in-memory snapshot, runs `setup` on the guest's
second serial port, and types `startCommand` into the visible terminal. From
then on the checks are evaluated every 1.5 s in one round trip and **latch**
once they pass, so the list ticks itself off as the learner works. There is no
"check my work" button.

Checks that were already true before the learner touched anything are marked
pre-satisfied and only latch once everything above them has, which is what stops
a lesson grading itself.

## Commands

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies |
| `bun run dev` | Dev server at `localhost:4321` |
| `bun run build` | Build to `./dist/` |
| `bun run preview` | Preview the build |
| `bun run check` | Type-check (needs TypeScript 6.x; 7's native compiler drops the API `astro check` uses) |
| `bun run guest:fetch` | Download v86, SeaBIOS and the kernel |
| `bun run guest:build` | Build the guest rootfs (needs Docker with `linux/386`) |
| `bun run guest:state` | Regenerate the boot snapshot |
| `bun run guest:publish` | Upload the guest machine to R2 (needs `wrangler login`) |

Lesson content is based on the official
[tmux Getting Started guide](https://github.com/tmux/tmux/wiki/Getting-Started).
