/**
 * Everything derived from the config gallery collection.
 *
 * Entry ids look like `minimal-green/index`, because each config is a directory
 * holding its write-up and its screenshot. The directory name is the slug, and
 * splitting it off is done here rather than in each page that needs a URL.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished } from './publishing';
import { configCategories, tallyCategories, type ConfigCategory } from './taxonomy';

export type ConfigEntry = CollectionEntry<'configs'>;

/** `minimal-green/index` -> `minimal-green` */
export const configSlug = (config: ConfigEntry): string => config.id.split('/')[0];

/** /gallery/minimal-green */
export const configPath = (config: ConfigEntry): string => `/gallery/${configSlug(config)}`;

/**
 * What the screenshot shows.
 *
 * Naming the config is true but says nothing, so it is only the fallback: an
 * entry whose picture has a point writes `coverAlt` and gets that instead.
 */
export const coverAlt = (config: ConfigEntry): string =>
  config.data.coverAlt ?? `Screenshot of the ${config.data.title} tmux configuration`;

/** Newest first. A gallery is a feed of finds, not a ranking. */
export function byConfigOrder(a: ConfigEntry, b: ConfigEntry): number {
  return b.data.added.getTime() - a.data.added.getTime();
}

export async function getConfigs(): Promise<ConfigEntry[]> {
  const configs = await getCollection('configs', isPublished);
  return configs.sort(byConfigOrder);
}

export function configsInCategory(configs: ConfigEntry[], id: ConfigCategory): ConfigEntry[] {
  return configs.filter((config) => config.data.categories.includes(id));
}

/** The categories that actually have a published config, with their counts. */
export function configCategoryTally(configs: ConfigEntry[]) {
  return tallyCategories(configCategories, configs, (config) => config.data.categories);
}
