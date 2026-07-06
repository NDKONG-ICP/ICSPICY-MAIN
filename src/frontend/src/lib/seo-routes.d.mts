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

export function guideSeoMeta(
  variety: {
    id: bigint | number;
    name: string;
    species: string;
    scovilleMax?: number;
    daysToMaturity?: number | null;
  },
  extras?: {
    provenance?: {
      breeder?: [] | [string];
      origin?: [] | [string];
      heatClass?: [] | [string];
    } | null;
    intro?: string | null;
  },
): { title: string; description: string; path: string };

export function guideBreadcrumbJsonLd(variety: {
  id: bigint | number;
  name: string;
}): object;

export function guideHowToJsonLd(
  variety: {
    id: bigint | number;
    name: string;
    species: string;
    scovilleMax?: number;
    daysToMaturity?: number | null;
  },
  sections: Array<{ title: string; content: string; timing?: string | null }>,
  plainTextFn: (content: string) => string,
  extras?: {
    provenance?: {
      breeder?: [] | [string];
      origin?: [] | [string];
      heatClass?: [] | [string];
    } | null;
    intro?: string | null;
  },
): object;

export function itemListJsonLd(
  name: string,
  items: Array<{ name: string; url: string }>,
): object | null;
