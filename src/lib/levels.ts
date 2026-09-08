/**
 * The four levels, in the order the official tmux guide teaches them.
 *
 * Static metadata only — titles, blurbs, URL slugs. Lesson counts and durations
 * are derived from the content collection at build time (see src/lib/lessons.ts),
 * so this file never goes stale when a lesson is added or dropped.
 */
export interface Level {
  n: 1 | 2 | 3 | 4;
  /** Top-level URL segment: /<slug> */
  slug: string;
  name: string;
  /** Short label used in headers and breadcrumbs, e.g. "Level 2 · Intermediate". */
  label: string;
  tagline: string;
  blurb: string;
  /** Search-facing title for the level hub page. */
  seoTitle: string;
  seoDescription: string;
}

export const levels: Level[] = [
  {
    n: 1,
    slug: 'basics',
    name: 'Basics',
    label: 'Basics',
    tagline: 'Sessions, the prefix key, panes, windows, detach and reattach.',
    blurb:
      'Start a session, learn the prefix key that every other shortcut hangs off, split the window into panes, and detach without losing your work.',
    seoTitle: 'tmux Basics: Sessions, Panes and Windows',
    seoDescription:
      'Learn tmux from scratch in a live terminal: start a session, use the prefix key, split panes, switch windows, and detach and reattach without losing work.',
  },
  {
    n: 2,
    slug: 'intermediate',
    name: 'Intermediate',
    label: 'Intermediate',
    tagline: 'Rename, zoom, resize, kill, layouts, tree mode, the command prompt.',
    blurb:
      'Shape a workspace: rename sessions and windows, zoom and resize panes, apply layouts, and drive tmux from its own command prompt.',
    seoTitle: 'Intermediate tmux: Layouts, Zoom, Resize and Tree Mode',
    seoDescription:
      'Hands-on tmux practice: rename sessions and windows, zoom and resize panes, apply window layouts, browse tree mode and use the tmux command prompt.',
  },
  {
    n: 3,
    slug: 'advanced',
    name: 'Advanced',
    label: 'Advanced',
    tagline: 'Copy mode, paste buffers, search, the mouse, break and join panes.',
    blurb:
      'Get text out of tmux and move panes between windows: copy mode, paste buffers, scrollback search, mouse support, break-pane and join-pane.',
    seoTitle: 'Advanced tmux: Copy Mode, Buffers and Pane Surgery',
    seoDescription:
      'Practise advanced tmux in a real terminal: copy mode, paste buffers, searching the scrollback, mouse support, and breaking and joining panes.',
  },
  {
    n: 4,
    slug: 'configure',
    name: 'Configure',
    label: 'Configure',
    tagline: 'Your .tmux.conf, a new prefix, key bindings, status line, vi keys.',
    blurb:
      'Write a tmux.conf you actually understand: set options, rebind the prefix, add your own key bindings, and style the status line.',
    seoTitle: 'Configure tmux: Writing Your Own .tmux.conf',
    seoDescription:
      'Build a tmux.conf line by line: set and unset options, change the prefix key, add key bindings, style the status line and switch on vi copy mode keys.',
  },
];

export const levelBySlug = new Map(levels.map((level) => [level.slug, level]));
export const levelByNumber = new Map(levels.map((level) => [level.n, level]));

export function getLevel(n: number): Level {
  const level = levelByNumber.get(n as Level['n']);
  if (!level) throw new Error(`no level ${n}`);
  return level;
}
