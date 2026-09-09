# The config gallery

One directory per config, holding its write-up and its screenshot:

```
src/content/configs/
  minimal-green/
    index.md
    cover.png
    avatar.png
```

`minimal-green/` is a working example — read it next to this file.

The directory name is the URL: `minimal-green/index.md` is served at
`/gallery/minimal-green`. This file is ignored by the loader, which only picks
up `*/index.md`.

## Frontmatter

```yaml
---
title: "Minimal green"                    # <= 65 characters
description: "One screen of config..."    # <= 155, the meta description
author:                                   # required: it is their work
  name: "Jane Roe"
  url: https://example.com                # optional
  avatar: ./avatar.png                    # optional, local file only
repo: https://github.com/...              # optional, where the file lives
cover: ./cover.png                        # required, relative to this directory
coverAlt: "A green status line..."        # optional, defaults to naming the config
categories: [minimal, status-line]        # one or more; a bare value is fine
tags: ["catppuccin", "vim-keys"]          # free text, searchable, links nowhere
tmuxVersion: "3.4"                        # optional
added: 2026-09-09
draft: false                              # optional, defaults to false
---
```

`categories` are the browsable axis: every one is a page under
`/gallery/category/<id>`, and a config filed under two appears on both. The
catalogue of legal values, and the copy each category's page carries, is
`src/lib/taxonomy.ts` — add a category there and it becomes valid here.

The avatar is a local file on purpose: a remote URL puts a third-party request
on the page and breaks the day the account is renamed. Download it into the
entry's directory.

`draft: true` keeps the entry out of the site entirely: no page, no card, no
sitemap entry, on a dev server as well as in a build. To read one in place, ask
for it: `SHOW_DRAFTS=1 bun run dev` renders drafts with a badge. See
`src/lib/publishing.ts`.
