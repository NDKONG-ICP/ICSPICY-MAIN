/**
 * seo-routes — single source of truth for per-route SEO metadata.
 *
 * Imported by BOTH the React pages (via the Seo component) and
 * scripts/prerender-routes.mjs, so titles/descriptions/JSON-LD never drift
 * between the live head manager and the prerendered HTML.
 *
 * Plain .mjs (not .ts) so the Node prerender script can import it directly.
 */

export const SITE_ORIGIN = "https://www.icspicy.app";

// ── Homepage FAQ (visible accordion + FAQPage schema must match) ────────────
export const HOME_FAQ_ITEMS = [
  {
    q: "What is NIMS?",
    a: "NIMS (Nursery Inventory Management System) is our free plant-tracking app. Log waterings, feedings, photos, and pests for every plant — each entry captures your local weather automatically, and your grow history is stored on the Internet Computer blockchain.",
  },
  {
    q: "What is an NFT plant?",
    a: "Every live plant from IC SPICY comes with an NFT that proves its provenance. The NFT records the plant's full lifecycle — seed date, germination, transplants, and care history — and travels with ownership if the plant is sold or gifted.",
  },
  {
    q: "Do you ship plants?",
    a: "Yes. We ship live pepper plants, seedlings, and artisan spice products across the United States from our FDACS-registered nursery in Port Charlotte, Florida.",
  },
  {
    q: "What growing methods do you use?",
    a: "We grow regeneratively using Korean Natural Farming (KNF) and JADAM methods — IMO soil biology, fermented plant inputs like FPJ, LAB, and OHN, and zero synthetic fertilizers or pesticides. Our free CookBook shares 50+ of these recipes.",
  },
  {
    q: "Is the 3D Garden Designer free?",
    a: "Yes. The Garden Designer is free and includes 385 Florida-friendly plants and 65 structures, with AI layout generation available to Raven Pro members.",
  },
];

export const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "GardenStore",
    name: "IC SPICY",
    description:
      "FDACS Registered Nursery in Port Charlotte, FL growing the world's rarest and hottest chili peppers with regenerative KNF & JADAM methods. Every live plant ships with an NFT proving its provenance. Free NIMS plant tracking, natural farming CookBook, and 3D garden designer.",
    url: "https://www.icspicy.app",
    image: "https://www.icspicy.app/banner.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Port Charlotte",
      addressRegion: "FL",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 26.9762,
      longitude: -82.0906,
    },
    priceRange: "$6–$45",
    sameAs: [
      "https://x.com/icspicyrwa",
      "https://www.youtube.com/@icspicyrwa",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
];

// ── Static route manifest ───────────────────────────────────────────────────
// `crawlParagraphs` is real descriptive content injected into the prerendered
// HTML for crawlers that don't execute JS.
export const STATIC_ROUTE_SEO = [
  {
    path: "/",
    title:
      "IC SPICY — Florida Hot Pepper Nursery | Live Plants with NFT Provenance",
    description:
      "FDACS Registered Nursery in Port Charlotte, FL. World's rarest and hottest chili peppers grown with regenerative KNF methods. Free NIMS plant tracking, natural farming CookBook, and 3D garden designer. Every plant ships with an NFT proving its provenance.",
    jsonLd: HOME_JSON_LD,
    crawlParagraphs: [
      "IC SPICY is an FDACS-registered nursery in Port Charlotte, Florida growing the world's rarest and hottest chili peppers — Carolina Reaper, 7 Pot Primo, Scotch Bonnet, and dozens more — using regenerative Korean Natural Farming (KNF) and JADAM methods with zero synthetic inputs.",
      "Every live plant ships with an NFT on the Internet Computer proving its provenance and full care history. Explore the free NIMS plant-tracking app, the natural farming CookBook with 50+ recipes, and the free 3D Garden Designer with 385 Florida plants.",
    ],
  },
  {
    path: "/marketplace",
    title: "Shop Hot Pepper Plants, Seeds & Artisan Spices | IC SPICY",
    description:
      "Live hot pepper plants with NFT provenance — seedlings from $6, 1-gallon $25, 5-gallon $45 — plus artisan spices, pods, and regenerative garden inputs. Shipped from our FDACS-registered Florida nursery.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "IC SPICY Shop",
      url: "https://www.icspicy.app/marketplace",
      description:
        "Live hot pepper plants, seedlings, artisan spices, and regenerative garden inputs shipped from Port Charlotte, Florida.",
    },
    crawlParagraphs: [
      "Shop live hot pepper plants with on-chain NFT provenance: seedlings from $6, 1-gallon plants for $25, and 5-gallon plants for $45. We also carry artisan spice blends, dried pods, and regenerative garden inputs — all shipped from our FDACS-registered nursery in Port Charlotte, Florida.",
    ],
  },
  {
    path: "/nims",
    title:
      "NIMS — Free Plant Tracking App | Weather, Lifecycle & Grow Logs | IC SPICY",
    description:
      "Track every plant from seed to harvest, free. NIMS logs waterings, feedings, photos, and pests — with automatic local weather capture and on-chain grow history. Built by the IC SPICY nursery in Port Charlotte, FL.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "NIMS — Nursery Inventory Management System",
      url: "https://www.icspicy.app/nims",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Free plant tracking app: lifecycle logs, weather capture, seed bank, tray management, and AI growing guides.",
    },
    crawlParagraphs: [
      "NIMS (Nursery Inventory Management System) is a free plant-tracking app for growers. Log waterings, feedings, transplants, photos, and pest events for every plant from seed to harvest — each entry automatically captures your local weather, and your grow history is stored on the Internet Computer blockchain.",
      "NIMS includes a seed bank, tray management for seedling grids, a growing-season care heatmap, and AI-generated variety growing guides personalized to your USDA zone.",
    ],
  },
  {
    path: "/cookbook",
    title: "Natural Farming Recipes — KNF, JADAM, FPJ, LAB | IC SPICY CookBook",
    description:
      "50+ free Korean Natural Farming and JADAM recipes: FPJ, LAB, OHN, IMO, fish amino acids, water-soluble calcium, and more. Step-by-step regenerative inputs from the IC SPICY nursery.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "IC SPICY Natural Farming CookBook",
      url: "https://www.icspicy.app/cookbook",
      description:
        "Free library of Korean Natural Farming (KNF) and JADAM recipes for regenerative growing.",
    },
    crawlParagraphs: [
      "The IC SPICY CookBook is a free library of 50+ Korean Natural Farming (KNF) and JADAM recipes: Fermented Plant Juice (FPJ), Lactic Acid Bacteria (LAB), Oriental Herbal Nutrient (OHN), Indigenous Microorganisms (IMO), Fish Amino Acid (FAA), water-soluble calcium, and more — each with step-by-step instructions, application rates, and safety notes.",
    ],
  },
  {
    path: "/garden",
    title: "Free 3D Garden Designer — 385 Florida Plants | IC SPICY",
    description:
      "Design your Florida garden in 3D, free. 385 plants, 65 structures, companion planting rules, satellite yard mode, and AI layout generation. Built for Zone 8b–11a growers.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "IC SPICY 3D Garden Designer",
      url: "https://www.icspicy.app/garden",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Free 3D garden design tool with 385 Florida plants, companion planting, and AI layout generation.",
    },
    crawlParagraphs: [
      "Design your Florida garden in interactive 3D, free. The IC SPICY Garden Designer includes 385 Florida-friendly plants, 65 structures like raised beds and irrigation, companion-planting rules, a satellite view of your real yard, and AI layout generation for Zone 8b–11a growers.",
    ],
  },
  {
    path: "/dao",
    title: "IC SPICY DAO — NFT Holder Governance on the Internet Computer",
    description:
      "Vote on nursery decisions with your IC SPICY plant NFT. On-chain governance, proposals, and community treasury — powered by the Internet Computer.",
    jsonLd: null,
    crawlParagraphs: [
      "IC SPICY NFT holders govern nursery decisions on-chain: vote on proposals, direct the community treasury, and shape which pepper varieties we grow next — all powered by the Internet Computer blockchain.",
    ],
  },
  {
    path: "/community",
    title: "Grower Community — Share Your Garden | IC SPICY",
    description:
      "Join the IC SPICY grower community: share plant photos, grow logs, and regenerative farming tips with hot pepper growers across the country.",
    jsonLd: null,
    crawlParagraphs: [
      "The IC SPICY grower community is where hot pepper growers share plant photos, on-chain videos, grow logs, and regenerative farming tips. Link posts to your NIMS plants and NFTs, tip fellow growers, and learn Korean Natural Farming together.",
    ],
  },
  {
    path: "/schedule-builder",
    title: "KNF Planting Schedule Builder — Free Grow Calendar | IC SPICY",
    description:
      "Build a personalized planting and KNF input schedule for your garden: seed dates, transplant windows, and stage-by-stage natural farming feedings for your USDA zone.",
    jsonLd: null,
    crawlParagraphs: [
      "Build a personalized planting and feeding calendar for your garden. The IC SPICY Schedule Builder maps seed-starting dates, transplant windows, and stage-by-stage Korean Natural Farming inputs — FPJ during vegetative growth, WCA during fruiting — to your USDA zone.",
    ],
  },
  {
    path: "/tiers",
    title: "Raven Membership Tiers — Perks for Growers | IC SPICY",
    description:
      "Compare IC SPICY membership tiers: shop discounts, AI garden layouts, personalized growing guides, PDF downloads, and more for Raven members.",
    jsonLd: null,
    crawlParagraphs: [
      "IC SPICY Raven membership unlocks grower perks across the platform: shop discounts, AI-powered garden layout generation, personalized KNF growing-guide regeneration for your soil and water conditions, and printable PDF guides.",
    ],
  },
];

/** Static route entry lookup by path. Throws when the route isn't in the manifest. */
export function staticRouteSeo(path) {
  const entry = STATIC_ROUTE_SEO.find((r) => r.path === path);
  if (!entry) throw new Error(`No SEO manifest entry for route: ${path}`);
  return entry;
}

/** Recipe page title/description — used by the page AND the prerender script. */
export function recipeSeoMeta(recipe) {
  return {
    title: `${recipe.title} Recipe — Korean Natural Farming | IC SPICY`,
    description: String(recipe.description ?? "").slice(0, 160),
    path: `/cookbook/${encodeURIComponent(recipe.slug)}`,
  };
}

/** BreadcrumbList JSON-LD for a recipe page. */
export function recipeBreadcrumbJsonLd(recipe, categoryLabel) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
      {
        "@type": "ListItem",
        position: 2,
        name: "CookBook",
        item: `${SITE_ORIGIN}/cookbook`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: categoryLabel,
        item: `${SITE_ORIGIN}/cookbook?category=${encodeURIComponent(categoryLabel)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: recipe.title,
        item: `${SITE_ORIGIN}/cookbook/${encodeURIComponent(recipe.slug)}`,
      },
    ],
  };
}

/** FAQPage JSON-LD from [(q, a)] pairs (recipe Common Questions). */
export function faqPageJsonLd(faqs) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
