/** Type declarations for seo-routes.mjs (shared with scripts/prerender-routes.mjs). */

export interface StaticRouteSeo {
  path: string;
  title: string;
  description: string;
  jsonLd: object | object[] | null;
  crawlParagraphs: string[];
}

export const SITE_ORIGIN: string;
export const HOME_FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }>;
export const HOME_JSON_LD: object[];
export const STATIC_ROUTE_SEO: StaticRouteSeo[];

export function staticRouteSeo(path: string): StaticRouteSeo;

export function recipeSeoMeta(recipe: {
  title: string;
  slug: string;
  description: string;
}): { title: string; description: string; path: string };

export function recipeBreadcrumbJsonLd(
  recipe: { title: string; slug: string },
  categoryLabel: string,
): object;

export function faqPageJsonLd(faqs: Array<[string, string]>): object | null;
