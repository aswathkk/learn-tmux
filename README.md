# learntmux

Learn tmux by doing it, not reading about it — four short levels, 42 hands-on
tasks, one real terminal in the browser. Live at [learntmux.dev](https://learntmux.dev).

Built with [Astro](https://astro.build) and Tailwind CSS.

## Project structure

```text
/
├── public/            # static assets (favicon, og-image, robots.txt)
├── src/
│   ├── components/    # Hero, Levels, Lesson, Terminal, CheatSheet, ...
│   ├── layouts/       # Layout.astro — head, meta, JSON-LD
│   ├── pages/         # index.astro
│   └── styles/        # global.css
└── astro.config.mjs
```

## Commands

Run from the project root:

| Command         | Action                                          |
| :-------------- | :---------------------------------------------- |
| `bun install`   | Install dependencies                            |
| `bun dev`       | Start the dev server at `localhost:4321`        |
| `bun build`     | Build the production site to `./dist/`          |
| `bun preview`   | Preview the build locally before deploying      |
| `bun astro ...` | Run CLI commands like `astro add`, `astro check` |

Content is based on the official
[tmux Getting Started guide](https://github.com/tmux/tmux/wiki/Getting-Started).
