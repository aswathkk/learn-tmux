/**
 * Structured data and page metadata.
 *
 * Two rules run through this file.
 *
 * Only markup that earns a rich result. Google dropped HowTo and FAQ rich
 * results in 2023, so those are not emitted: they add weight and return
 * nothing. What stays is BreadcrumbList (a real result), Course and
 * LearningResource (understood by Google's course surfaces), and Article.
 *
 * Nothing is hardcoded that can be derived. Lesson counts, durations and key
 * counts come from the content collection, so the markup cannot claim 42
 * lessons after a 43rd is added.
 */
import type { CourseStats } from './lessons';

export const SITE_NAME = 'learntmux';
export const SITE_URL = 'https://learntmux.dev';
export const TWITTER_CARD = 'summary_large_image';
/** The social card used wherever a page does not supply its own. */
export const DEFAULT_SOCIAL_IMAGE = '/og-image.png';

export interface BreadcrumbEntry {
  name: string;
  /** Site-relative path, with the trailing slash. Omit on the current page. */
  href?: string;
}

/**
 * The canonical form of a path.
 *
 * `build.format: 'file'` writes /basics.html, and at build time `Astro.url`
 * carries that filename, so a canonical derived straight from it would declare
 * the .html URL rather than the one the site links to. Strips the extension,
 * the /index part, and any trailing slash.
 */
export function canonicalPath(pathname: string): string {
  const cleaned = pathname
    .replace(/\/index\.html$/, '')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

/** Absolute URL for a site-relative path. */
export function absolute(path: string, site: URL | undefined = new URL(SITE_URL)): string {
  return new URL(path, site).toString();
}

export function breadcrumbJsonLd(entries: BreadcrumbEntry[], site?: URL): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      ...(entry.href ? { item: absolute(entry.href, site) } : {}),
    })),
  };
}

export function organizationJsonLd(site?: URL): object {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: absolute('/', site),
  };
}

export interface CourseJsonLdInput {
  description: string;
  stats: CourseStats;
  /** ISO 8601, e.g. PT2H10M. */
  duration: string;
  site?: URL;
}

export function courseJsonLd({ description, stats, duration, site }: CourseJsonLdInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    '@id': `${SITE_URL}/#course`,
    name: SITE_NAME,
    description,
    url: absolute('/', site),
    inLanguage: 'en',
    isAccessibleForFree: true,
    teaches: 'tmux terminal multiplexer',
    educationalLevel: 'Beginner to advanced',
    numberOfCredits: stats.lessons,
    provider: organizationJsonLd(site),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: duration,
    },
  };
}

export interface LessonJsonLdInput {
  title: string;
  description: string;
  path: string;
  /** Concepts the lesson teaches, straight from frontmatter. */
  teaches: string[];
  difficulty: string;
  minutes: number;
  position: number;
  site?: URL;
}

/**
 * A lesson is a LearningResource inside the course, not a Course of its own.
 * `isPartOf` points at the course node so the two are linked rather than
 * competing.
 */
export function lessonJsonLd(input: LessonJsonLdInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: input.title,
    description: input.description,
    url: absolute(input.path, input.site),
    inLanguage: 'en',
    isAccessibleForFree: true,
    learningResourceType: 'Interactive exercise',
    educationalLevel: input.difficulty,
    teaches: input.teaches,
    timeRequired: `PT${input.minutes}M`,
    position: input.position,
    isPartOf: { '@type': 'Course', '@id': `${SITE_URL}/#course` },
    provider: organizationJsonLd(input.site),
  };
}

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  path: string;
  published: Date;
  updated?: Date;
  /** Site-relative social card. Defaults to the site-wide one. */
  image?: string;
  site?: URL;
}

/**
 * `image` and `mainEntityOfPage` are not optional extras here: without an image
 * Google will not build an Article rich result at all, and guides are the half
 * of the site that arrives from search.
 */
export function articleJsonLd(input: ArticleJsonLdInput): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: absolute(input.path, input.site),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(input.path, input.site) },
    image: absolute(input.image ?? DEFAULT_SOCIAL_IMAGE, input.site),
    inLanguage: 'en',
    datePublished: input.published.toISOString(),
    dateModified: (input.updated ?? input.published).toISOString(),
    author: organizationJsonLd(input.site),
    publisher: organizationJsonLd(input.site),
  };
}

/** A plain ItemList, used by hub pages to declare their contents in order. */
export function itemListJsonLd(
  items: Array<{ name: string; href: string }>,
  site?: URL,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absolute(item.href, site),
    })),
  };
}
