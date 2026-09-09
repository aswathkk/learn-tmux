/**
 * The categories a guide or a gallery config can be filed under.
 *
 * Both collections take a *list* of categories, not one: "a tmux.conf worth
 * copying, line by line" is a config piece and a setup piece, and a config that
 * ships a theme usually rebinds half the keys as well. Filing each entry once
 * meant picking the losing half of that sentence and losing the reader who
 * searched for it.
 *
 * The catalogue lives here rather than in src/content.config.ts because three
 * separate things need it: the schema (to validate the enum), the pages (to
 * name a category), and the category routes (to build a page out of one). It is
 * the single place a category is described, so a new one is added once and is
 * immediately a valid frontmatter value, a chip on the index, and a page of its
 * own with its own copy.
 */

export interface Category {
  /** The frontmatter value and the last URL segment. Kebab-case. */
  id: string;
  /** What it is called in running text and on a chip. */
  name: string;
  /** The <title> of its page, before " | learntmux". */
  title: string;
  /** The <h1> of its page. */
  heading: string;
  /**
   * The lede on its page, and its meta description. Kept under 155 characters,
   * where Google truncates, and written per category: a hub page that only
   * lists other pages is a thin page, and thin pages do not rank.
   */
  blurb: string;
}

export const guideCategories = [
  {
    id: 'setup',
    name: 'Setup',
    title: 'tmux Setup Guides: Install and First Run',
    heading: 'Getting tmux installed and out of your way.',
    blurb:
      'Installing tmux, getting it running, and the handful of defaults worth changing before you learn anything else.',
  },
  {
    id: 'workflow',
    name: 'Workflow',
    title: 'tmux Workflow Guides: Sessions, Windows, Scripts',
    heading: 'Shapes for your sessions.',
    blurb:
      'Patterns that hold up day to day: a session per project, windows worth naming, and a script that rebuilds the lot.',
  },
  {
    id: 'config',
    name: 'Configuration',
    title: 'tmux Config Guides: tmux.conf, Bindings, Status',
    heading: 'A tmux.conf you can explain line by line.',
    blurb:
      'Writing a config you understand: the options, the bindings, the status line, and the plugins that earn their weight.',
  },
  {
    id: 'remote',
    name: 'Remote',
    title: 'tmux Remote Guides: SSH, mosh, Detached Sessions',
    heading: 'Sessions that survive the network.',
    blurb:
      'Keeping work alive across SSH, mosh and a closed laptop lid, and getting back into it from whatever machine you are on.',
  },
] as const satisfies readonly Category[];

export const configCategories = [
  {
    id: 'minimal',
    name: 'Minimal',
    title: 'Minimal tmux Configs',
    heading: 'Short configs that stop.',
    blurb:
      'Configs of a few dozen lines: fix the defaults everyone trips over, add nothing else, stay readable a year later.',
  },
  {
    id: 'theme',
    name: 'Themes',
    title: 'Themed tmux Configs: Catppuccin, Gruvbox, Nord',
    heading: 'Themed tmux configs.',
    blurb:
      'Full colour schemes wired through the status line, the pane borders and the message bar, with the file behind each one.',
  },
  {
    id: 'status-line',
    name: 'Status line',
    title: 'tmux Status Line Configs and Formats',
    heading: 'Status lines worth stealing.',
    blurb:
      'Configs built around what the status line says: session, host, battery, git branch, and the format strings that print them.',
  },
  {
    id: 'plugins',
    name: 'Plugins',
    title: 'tmux Plugin Configs: tpm, resurrect, continuum',
    heading: 'Configs built on plugins.',
    blurb:
      'Configs that lean on tpm and its ecosystem — resurrect, continuum, yank — and what each plugin actually buys you.',
  },
  {
    id: 'keybindings',
    name: 'Key bindings',
    title: 'tmux Key Binding Configs and Prefix Keys',
    heading: 'Configs that rebind the keys.',
    blurb:
      'A different prefix, vim motions between panes, repeatable resizes: configs whose point is the keyboard, not the colours.',
  },
] as const satisfies readonly Category[];

/** The catalogue entries themselves, whose `id` is the literal union. */
export type GuideCategoryMeta = (typeof guideCategories)[number];
export type ConfigCategoryMeta = (typeof configCategories)[number];

export type GuideCategory = GuideCategoryMeta['id'];
export type ConfigCategory = ConfigCategoryMeta['id'];

/**
 * The ids as the tuple zod's `enum` wants. Derived rather than written out, so
 * a category added above cannot be missing from the schema that validates it.
 */
const ids = <T extends readonly Category[]>(catalogue: T) =>
  catalogue.map((category) => category.id) as unknown as [
    T[number]['id'],
    ...T[number]['id'][],
  ];

export const guideCategoryIds = ids(guideCategories);
export const configCategoryIds = ids(configCategories);

const index = <T extends readonly Category[]>(catalogue: T) =>
  Object.fromEntries(catalogue.map((category) => [category.id, category])) as Record<
    T[number]['id'],
    T[number]
  >;

const guidesById = index(guideCategories);
const configsById = index(configCategories);

export const guideCategory = (id: GuideCategory): Category => guidesById[id];
export const configCategory = (id: ConfigCategory): Category => configsById[id];

/** /guides/category/config */
export const guideCategoryPath = (id: GuideCategory): string => `/guides/category/${id}`;

/** /gallery/category/theme */
export const configCategoryPath = (id: ConfigCategory): string => `/gallery/category/${id}`;

export interface CategoryTally<C extends Category = Category> {
  category: C;
  count: number;
}

/**
 * How many entries each category holds, in catalogue order, with the empty ones
 * dropped. A chip that leads to an empty page is worse than no chip, and the
 * category routes are generated from the same tally, so the two cannot disagree.
 */
export function tallyCategories<C extends Category, T>(
  catalogue: readonly C[],
  entries: readonly T[],
  categoriesOf: (entry: T) => readonly string[],
): CategoryTally<C>[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const id of categoriesOf(entry)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return catalogue
    .map((category) => ({ category, count: counts.get(category.id) ?? 0 }))
    .filter((tally) => tally.count > 0);
}
