/**
 * Everything derived from the guides collection: which ones exist, in what
 * order, and what to read after one.
 *
 * The draft rule lives in src/lib/publishing.ts and is applied here, once, so
 * no page can forget it: an index, a feed and a "read next" list that disagree
 * about whether a guide exists is how a draft leaks.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished } from './publishing';
import { guideCategories, tallyCategories, type GuideCategory } from './taxonomy';

export type GuideEntry = CollectionEntry<'guides'>;

/** /guides/tmux-workflows */
export const guidePath = (guide: GuideEntry): string => `/guides/${guide.id}`;

/**
 * Featured first, then newest. A featured guide stays pinned until unset.
 */
export function byGuideOrder(a: GuideEntry, b: GuideEntry): number {
  if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
  return b.data.published.getTime() - a.data.published.getTime();
}

export async function getGuides(): Promise<GuideEntry[]> {
  const guides = await getCollection('guides', isPublished);
  return guides.sort(byGuideOrder);
}

export function guidesInCategory(guides: GuideEntry[], id: GuideCategory): GuideEntry[] {
  return guides.filter((guide) => guide.data.categories.includes(id));
}

/**
 * The categories that actually have a published guide, with their counts. The
 * return type is inferred so `category.id` stays the literal union and can be
 * handed straight to `guideCategoryPath`.
 */
export function guideCategoryTally(guides: GuideEntry[]) {
  return tallyCategories(guideCategories, guides, (guide) => guide.data.categories);
}

/**
 * What to offer at the foot of a guide.
 *
 * The author's own `relatedGuides` come first, in the order they wrote them.
 * The rest of the slots go to guides sharing a category — the reader is already
 * reading about remote sessions, so the other remote guide beats whatever
 * happens to be newest — and only then to recency.
 */
export function readNext(guide: GuideEntry, guides: GuideEntry[], limit = 2): GuideEntry[] {
  const others = guides.filter((other) => other.id !== guide.id);

  const named = guide.data.relatedGuides
    .map((id: string) => others.find((other) => other.id === id))
    .filter((other): other is GuideEntry => Boolean(other));

  const shares = (other: GuideEntry) =>
    other.data.categories.some((id) => guide.data.categories.includes(id));

  const rest = others
    .filter((other) => !named.includes(other))
    .sort((a, b) => {
      const related = Number(shares(b)) - Number(shares(a));
      return related || b.data.published.getTime() - a.data.published.getTime();
    });

  return [...named, ...rest].slice(0, limit);
}
