## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Content

Two authored collections, both validated in `src/content.config.ts`.

**Guides** — `src/content/guides/<slug>.md`, served at `/guides/<slug>`:

```yaml
---
title: "..."                              # <= 65 characters
description: "..."                        # <= 155, the meta description
seoTitle: "..."                           # optional, overrides <title>
categories: [config, setup]               # one or more; a bare value is fine
cover: ./covers/<slug>.png                # optional; also the social card
coverAlt: "..."                           # optional; omit and it is decorative
author:                                   # optional
  name: learntmux
  url: https://learntmux.dev
  avatar: ./authors/learntmux.png
published: 2026-09-08
updated: 2026-09-09                       # optional
featured: false                           # pins it to the top of the index
relatedLessons: ["tmux-conf-file"]        # lesson slugs
relatedGuides: ["tmux-workflows"]         # guide ids, in the order to offer them
draft: false
---
```

**Config gallery** — one directory each under `src/content/configs/`. See
`src/content/configs/README.md`, and `minimal-green/` for a working example.

The category catalogue for both — ids, names, and the copy each category's page
carries — is `src/lib/taxonomy.ts`. Add one there and it becomes a legal
frontmatter value, a chip on the index, and a page at
`/guides/category/<id>` or `/gallery/category/<id>`.

`draft: true` keeps an entry out of the built site completely: no page, no row,
no RSS item, no sitemap entry, no link from anywhere. Dev servers hide drafts
too. To read one in place, ask for it:

```
SHOW_DRAFTS=1 bun run dev
```

See `src/lib/publishing.ts`.
