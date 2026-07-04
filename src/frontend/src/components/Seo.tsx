/**
 * Seo — lightweight per-route head manager (no external dependency).
 *
 * Sets document.title, meta description, canonical URL, Open Graph /
 * Twitter tags, and optional JSON-LD structured data. Tags are upserted
 * (marked data-seo="dynamic") so route changes replace rather than
 * accumulate. The static defaults in index.html remain the crawler-first
 * fallback; this component takes over once the app hydrates.
 */
import { useEffect } from "react";

export const SITE_ORIGIN = "https://www.icspicy.app";
const SITE_NAME = "IC SPICY";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/banner.png`;

type SeoProps = {
  /** Full document title (used verbatim — include branding yourself). */
  title: string;
  description: string;
  /** Path beginning with "/" — canonical resolves against icspicy.app. */
  path: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  /** One or more schema.org objects rendered as JSON-LD script tags. */
  jsonLd?: object | object[];
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "dynamic");
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSONLD_ID = "seo-route-jsonld";

function setJsonLd(serialized: string | undefined) {
  document.getElementById(JSONLD_ID)?.remove();
  if (!serialized) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = JSONLD_ID;
  script.textContent = serialized;
  document.head.appendChild(script);
}

export function Seo({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
}: SeoProps) {
  // Serialize outside the effect so object-identity churn from inline
  // jsonLd props doesn't re-run the effect every render.
  const jsonLdStr = jsonLd
    ? JSON.stringify(
        Array.isArray(jsonLd) && jsonLd.length === 1 ? jsonLd[0] : jsonLd,
      )
    : undefined;

  useEffect(() => {
    const canonical = `${SITE_ORIGIN}${path}`;

    document.title = title;
    upsertMeta("name", "description", description);
    upsertCanonical(canonical);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:type", ogType);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    setJsonLd(jsonLdStr);
  }, [title, description, path, ogImage, ogType, jsonLdStr]);

  return null;
}
