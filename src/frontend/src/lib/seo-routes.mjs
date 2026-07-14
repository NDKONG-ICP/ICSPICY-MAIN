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

export const SOCIAL_SAME_AS = [
  "https://x.com/icspicyrwa",
  "https://www.facebook.com/share/18FY3jmLuY/?mibextid=wwXIfr",
  "https://www.instagram.com/icspicyrwa",
  "https://www.tiktok.com/@icspicyrwa",
  "https://www.youtube.com/@icspicyrwa",
];

/** Routes that must never be indexed (not in sitemap, not prerendered). */
export const NOINDEX_ROUTE_EXACT = [
  "/wallet",
  "/admin",
  "/checkout",
  "/orders",
  "/profile",
];

export const NOINDEX_ROUTE_PREFIXES = ["/claim/"];

export function isNoindexRoute(path) {
  if (NOINDEX_ROUTE_EXACT.includes(path)) return true;
  return NOINDEX_ROUTE_PREFIXES.some((p) => path.startsWith(p));
}

export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "IC SPICY",
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/icon-512.png`,
  sameAs: SOCIAL_SAME_AS,
};

export const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "IC SPICY",
  url: SITE_ORIGIN,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_ORIGIN}/cookbook?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

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
  ORGANIZATION_JSON_LD,
  WEBSITE_JSON_LD,
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
    sameAs: SOCIAL_SAME_AS,
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
    path: "/games",
    title: "Games | IC SPICY — Slice, Grow & Craft the Heat",
    description:
      "Play ICSPICY arcade games — slice peppers, grow your patch, and craft small-batch heat. Compete on global SHU leaderboards from the IC SPICY pepper nursery.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "ICSPICY Games",
      url: "https://www.icspicy.app/games",
      description:
        "IC SPICY pepper arcade games with on-chain SHU leaderboards.",
    },
    crawlParagraphs: [
      "ICSPICY Games brings arcade pepper action to the IC SPICY brand: ICSPICY Slicer, the flagship ICSPICY Pepper Patch grow sim, and ICSPICY Small Batch Crafter. Sign in with Internet Identity to save your score and climb the global SHU leaderboard.",
    ],
  },
  {
    path: "/games/leaderboard",
    title: "Arcade Scoreboards | ICSPICY Games — SHU Leaderboards",
    description:
      "Full ICSPICY arcade leaderboards for Slicer, Pepper Patch, and Small Batch Crafter. See your rank, scroll the top 100, and compete on global Scoville scoreboards.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "ICSPICY Arcade Scoreboards",
      url: "https://www.icspicy.app/games/leaderboard",
      description:
        "State-fair style arcade leaderboards for ICSPICY pepper games.",
    },
    crawlParagraphs: [
      "Browse the full top-100 SHU leaderboards for ICSPICY Slicer, Pepper Patch, and Small Batch Crafter. Your row is highlighted and scrolled into view when you are on the board; ranks outside the top 100 appear in a pinned YOU row.",
    ],
  },
  {
    path: "/games/slicer",
    title: "ICSPICY Slicer — Swipe-to-Slice Pepper Game | IC SPICY",
    description:
      "Swipe-to-slice pepper game: cut chilies, mangoes, and garlic mid-air, chain SHU combos, and survive frenzy bursts. Free mobile arcade from IC SPICY.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: "ICSPICY Slicer",
      url: "https://www.icspicy.app/games/slicer",
      description:
        "Mobile-first swipe-to-slice arcade game with Scoville scoring and on-chain leaderboards.",
      gamePlatform: "Web browser",
      genre: "Arcade",
      publisher: { "@type": "Organization", name: "IC SPICY" },
    },
    crawlParagraphs: [
      "ICSPICY Slicer is a free swipe-to-slice pepper game from IC SPICY. Launch ingredients into the air, slice them with fast swipes to rack up SHU points, chain combos, and climb the global leaderboard. Sign in with Internet Identity to save your best small-batch score.",
    ],
  },
  {
    path: "/games/crafter",
    title: "ICSPICY Small Batch Crafter — Blend Artisan Heat | IC SPICY",
    description:
      "Craft small-batch pepper sauces in a bubbling pot. Mix real ICSPICY chili varieties, balance heat and harmony, bottle your batch, and climb the crafter SHU leaderboard.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: "ICSPICY Small Batch Crafter",
      url: "https://www.icspicy.app/games/crafter",
      description:
        "Mobile-first ingredient-mixing game with Scoville scoring, saved recipes, and on-chain leaderboards.",
      gamePlatform: "Web browser",
      genre: "Simulation",
      publisher: { "@type": "Organization", name: "IC SPICY" },
    },
    crawlParagraphs: [
      "ICSPICY Small Batch Crafter lets you blend artisan pepper sauces with real variety SHU values — Carolina Reaper, Scotch Bonnet, 7 Pot Primo, and more. Balance heat, sweet-acid, and flavor harmony, bottle your batch, save favorite recipes, and compete on the crafter leaderboard.",
    ],
  },
  {
    path: "/games/pepper-patch",
    title: "ICSPICY Pepper Patch — Virtual Pepper Garden Simulator | IC SPICY",
    description:
      "Flagship grow sim: plant real ICSPICY pepper varieties, water and feed on timers, harvest SHU small batches, and unlock Carolina Reaper and legendary heat.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "VideoGame",
      name: "ICSPICY Pepper Patch",
      url: "https://www.icspicy.app/games/pepper-patch",
      description:
        "Mobile-first virtual pepper garden with on-chain save, Pepperpedia variety guides, and SHU leaderboards.",
      gamePlatform: "Web browser",
      genre: "Simulation",
      publisher: { "@type": "Organization", name: "IC SPICY" },
    },
    crawlParagraphs: [
      "ICSPICY Pepper Patch is the flagship virtual pepper garden from IC SPICY. Grow Jalapeño through Carolina Reaper and legendary varieties, companion-plant with onion and garlic, earn Heat Reserve, and link each variety to real Pepperpedia growing guides.",
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
    title: "Community Garden — Growers Helping Growers | IC SPICY",
    description:
      "Growers helping growers — share plant photos, grow logs, and regenerative farming tips in the IC SPICY Community Garden.",
    jsonLd: null,
    crawlParagraphs: [
      "The IC SPICY Community Garden is where hot pepper growers share plant photos, on-chain videos, grow logs, and regenerative farming tips. Growers helping growers — link posts to your NIMS plants and NFTs, tip fellow growers, and learn Korean Natural Farming together.",
    ],
  },
  {
    path: "/guides",
    title: "Pepperpedia — Variety Index & KNF Growing Guides | IC SPICY",
    description:
      "Searchable pepper variety index with breeder credits, heat class, and vendor sources — plus free regenerative KNF growing guides for every cultivar in the catalog.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "IC SPICY Pepperpedia",
      url: "https://www.icspicy.app/guides",
      description:
        "Permanent variety index and zone-personalized regenerative growing guides, built on Korean Natural Farming.",
    },
    crawlParagraphs: [
      "Pepperpedia is IC SPICY's permanent variety index — searchable by species, heat class, and breeder, with original cultivar credits and vendor source links. Every entry links to a free regenerative growing guide covering soil preparation with IMO, planting windows for your USDA zone, stage-by-stage Korean Natural Farming nutrition, natural pest control, and harvest.",
    ],
  },
  {
    path: "/credits",
    title: "Photo & Seed Credits — Pepperpedia Vendors | IC SPICY",
    description:
      "IC SPICY thanks Refining Fire Chiles (Super Hot Chiles) and Towns-End Chili & Spice for licensed product photography and seed catalog data used in Pepperpedia.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Photo & Seed Credits",
      url: "https://www.icspicy.app/credits",
      description:
        "Vendor attribution for Pepperpedia photography and seed sources.",
    },
    crawlParagraphs: [
      "Seeds and photography courtesy of Refining Fire Chiles and Towns-End Chili & Spice — with direct links to both shops and written permission for Pepperpedia use.",
    ],
  },
  {
    path: "/growers",
    title: "Grower Co-op Directory — Founding Pepper Growers | IC SPICY",
    description:
      "Public directory of IC SPICY Grower Co-op founding members — regenerative pepper farms and nurseries with on-chain plant provenance, profiles, and customer QR claims.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "IC SPICY Grower Directory",
      url: "https://www.icspicy.app/growers",
      description:
        "Founding members of the IC SPICY Grower Co-op with public grower profiles and blockchain plant provenance.",
    },
    crawlParagraphs: [
      "The IC SPICY Grower Directory lists founding co-op members who completed their grower profile — farm name, location, plant counts, and provenance NFTs minted. Join the co-op on the marketplace to unlock pro NIMS, customer QR claims, and a public listing.",
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

/** Variety guide page title/description — used by VarietyGuide page + prerender. */
export function guideSeoMeta(variety, extras = {}) {
  const { provenance = null, intro = null } = extras;
  const name = variety.name;
  const scoville = Number(variety.scovilleMax ?? 0);
  const days =
    variety.daysToMaturity != null ? Number(variety.daysToMaturity) : null;
  const bits = [variety.species];
  if (provenance?.heatClass?.length > 0) bits.push(provenance.heatClass[0]);
  else if (scoville > 0) bits.push(`up to ${scoville.toLocaleString()} SHU`);
  if (days != null) bits.push(`~${days} days to maturity`);
  if (provenance?.breeder?.length > 0) bits.push(`bred by ${provenance.breeder[0]}`);
  if (provenance?.origin?.length > 0) bits.push(`origin ${provenance.origin[0]}`);
  const detail = bits.join(" · ");
  const fallbackDescription = `Regenerative growing guide for ${name} (${detail}): soil prep, planting windows, stage-by-stage Korean Natural Farming nutrition, and natural pest control — linked to real CookBook recipes.`;
  return {
    title: `How to Grow ${name} — KNF Regenerative Guide | IC SPICY`,
    description: intro && intro.length > 0 ? intro : fallbackDescription,
    path: `/variety/${variety.id.toString()}/guide`,
  };
}

/** BreadcrumbList JSON-LD for a variety guide page. */
export function guideBreadcrumbJsonLd(variety) {
  const id = variety.id.toString();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
      {
        "@type": "ListItem",
        position: 2,
        name: "Growing Guides",
        item: `${SITE_ORIGIN}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: variety.name,
        item: `${SITE_ORIGIN}/variety/${id}/guide`,
      },
    ],
  };
}

/** HowTo JSON-LD from fallback guide sections. */
export function guideHowToJsonLd(variety, sections, plainTextFn, extras = {}) {
  const meta = guideSeoMeta(variety, extras);
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Grow ${variety.name}`,
    description: meta.description,
    image: `${SITE_ORIGIN}/og/guide-${variety.id.toString()}.png`,
    url: `${SITE_ORIGIN}${meta.path}`,
    step: sections.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: plainTextFn(s.content),
      ...(s.timing ? { itemListElement: [{ "@type": "HowToDirection", text: s.timing }] } : {}),
    })),
  };
}

/** ItemList JSON-LD for hub pages (/guides, /cookbook). */
export function itemListJsonLd(name, items) {
  if (!items || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
