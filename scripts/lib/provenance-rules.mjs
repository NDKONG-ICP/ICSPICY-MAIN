/**
 * Shared provenance cleanup rules — only two authorized seed/photo vendors.
 */

export const ALLOWED_DOMAINS = ["superhotchiles.com", "towns-endchiliandspice.com"];

export const AUTHORIZED_VENDORS = {
  "towns-endchiliandspice.com": {
    vendorName: "Towns-End Chili & Spice",
    displayName: "Towns-End Chili & Spice",
    domain: "towns-endchiliandspice.com",
    shopUrl: "https://towns-endchiliandspice.com",
    photoCredit: "Photo courtesy of Towns-End Chili & Spice — used with permission",
    catalogKey: "townsend",
  },
  "superhotchiles.com": {
    vendorName: "Refining Fire Chiles",
    displayName: "Refining Fire Chiles",
    domain: "superhotchiles.com",
    shopUrl: "https://www.superhotchiles.com",
    photoCredit: "Photo courtesy of Refining Fire Chiles — used with permission",
    catalogKey: "superhotchiles",
  },
};

/** Retailers/shops — never valid as breeder field (factual person breeders stay). */
export const BREEDER_RETAILER_DENYLIST = [
  /^pepper\s+guru$/i,
  /^puckerbutt(\s+pepper\s+company)?$/i,
  /^refining\s+fire(\s+chiles?)?$/i,
  /^super\s+hot\s+chiles?$/i,
  /^towns-?end(\s+chili\s*&\s*spice)?$/i,
  /^seed\s*(vendor|supplier|source|bank|company)$/i,
  /^amazon$/i,
  /^etsy$/i,
  /^ebay$/i,
];

/** Sentence fragments / junk the scraper sometimes captured. */
export const BREEDER_JUNK_PATTERNS = [
  /\b(seeds?|plants?|peppers?|pods?)\b/i,
  /\b(from|via|available|sold)\b/i,
  /\bhttps?:\/\//i,
  /^\W+$/, // punctuation only
  /.{120,}/, // too long — likely prose fragment
];

export function domainFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, "");
    for (const d of ALLOWED_DOMAINS) {
      if (host === d || host.endsWith(`.${d}`)) return d;
    }
    return host || null;
  } catch {
    return null;
  }
}

export function isAllowedSource(source) {
  const domain = domainFromUrl(source?.url);
  return domain != null && ALLOWED_DOMAINS.includes(domain);
}

/** Normalize cleaned sources — canonical vendorName per domain, dedupe by URL. */
export function cleanSources(sources) {
  if (!Array.isArray(sources)) return [];
  const seen = new Set();
  const out = [];
  for (const s of sources) {
    if (!isAllowedSource(s)) continue;
    const domain = domainFromUrl(s.url);
    const meta = AUTHORIZED_VENDORS[domain];
    const url = String(s.url).trim().slice(0, 500);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      vendorName: meta?.vendorName ?? String(s.vendorName ?? "").trim().slice(0, 120),
      url,
    });
  }
  return out.slice(0, 8);
}

export function sanitizeBreeder(breeder) {
  if (breeder == null) return null;
  const t = String(breeder).trim();
  if (!t) return null;
  for (const re of BREEDER_RETAILER_DENYLIST) {
    if (re.test(t)) return null;
  }
  for (const re of BREEDER_JUNK_PATTERNS) {
    if (re.test(t)) return null;
  }
  return t.length <= 200 ? t : t.slice(0, 200);
}

export function optText(v) {
  return v != null && v.length > 0 ? v[0] : null;
}

export function optTextArr(v) {
  return v != null && String(v).trim() ? [String(v).trim()] : [];
}

/** Primary authorized vendor domain from cleaned sources (first entry wins). */
export function primarySourceDomain(sources) {
  const cleaned = cleanSources(sources);
  if (cleaned.length === 0) return null;
  return domainFromUrl(cleaned[0].url);
}

/** Which vendor name is credited in photoCredit text. */
export function photoCreditVendor(photoCredit) {
  if (!photoCredit) return null;
  const t = String(photoCredit).toLowerCase();
  if (t.includes("refining fire") || t.includes("super hot chiles")) {
    return "superhotchiles.com";
  }
  if (t.includes("towns-end") || t.includes("townsend")) {
    return "towns-endchiliandspice.com";
  }
  return null;
}

/** True when burned-in photo credit matches any authorized source on the variety. */
export function photoCreditMatchesSources(photoCredit, sources) {
  const creditDomain = photoCreditVendor(photoCredit);
  if (!creditDomain) return false;
  const cleaned = cleanSources(sources);
  return cleaned.some((s) => domainFromUrl(s.url) === creditDomain);
}

/** True when photo credit matches the primary (first) authorized source. */
export function photoCreditMatchesPrimarySource(photoCredit, sources) {
  const creditDomain = photoCreditVendor(photoCredit);
  const primary = primarySourceDomain(sources);
  if (!primary) return true;
  if (!creditDomain) return false;
  return creditDomain === primary;
}

/** Expected photo vendor domain — primary source, or null if no authorized sources. */
export function expectedPhotoDomain(sources) {
  return primarySourceDomain(sources);
}

export function hardcodedSource(vendorKey, productUrl) {
  if (vendorKey === "townsend") {
    const meta = AUTHORIZED_VENDORS["towns-endchiliandspice.com"];
    return { vendorName: meta.vendorName, url: productUrl };
  }
  if (vendorKey === "superhotchiles") {
    const meta = AUTHORIZED_VENDORS["superhotchiles.com"];
    return { vendorName: meta.vendorName, url: productUrl };
  }
  return null;
}

/** Tight breeder extraction for scrapers — explicit markers only. */
export function extractBreederFromText(text, title, options = {}) {
  const blob = `${title ?? ""} ${text ?? ""}`;
  const isTE = /\(\s*T-E\s*\)/i.test(title ?? "") || /\(\s*T-E\s*\)/i.test(blob);

  if (isTE) {
    return {
      breeder: "Towns-End (William Townshend, South Florida)",
      breederLocation: "South Florida, USA",
    };
  }

  const bredBy = blob.match(
    /\b(?:bred|created|developed)\s+by\s+([A-Z][A-Za-z.'\-\s]{2,48}?)(?:\s+in\b|[.;,\n]|$)/i,
  );
  if (bredBy) {
    const name = bredBy[1].trim().replace(/\.$/, "");
    const sanitized = sanitizeBreeder(name);
    if (sanitized) return { breeder: sanitized, breederLocation: null };
  }

  if (options.namePatterns) {
    for (const { pattern, breeder, breederLocation } of options.namePatterns) {
      if (pattern.test(title ?? "") || pattern.test(blob)) {
        const sanitized = breeder != null ? sanitizeBreeder(breeder) : null;
        if (sanitized) return { breeder: sanitized, breederLocation: breederLocation ?? null };
      }
    }
  }

  return { breeder: null, breederLocation: null };
}

export function auditEntry(provenance) {
  const sourceVendorNames = new Map();
  const sourceDomains = new Map();
  const breeders = new Map();

  for (const s of provenance?.sources ?? []) {
    const vn = String(s.vendorName ?? "").trim() || "(empty)";
    sourceVendorNames.set(vn, (sourceVendorNames.get(vn) ?? 0) + 1);
    const d = domainFromUrl(s.url) ?? "(invalid)";
    sourceDomains.set(d, (sourceDomains.get(d) ?? 0) + 1);
  }

  const b = optText(provenance?.breeder);
  if (b) breeders.set(b, (breeders.get(b) ?? 0) + 1);

  return { sourceVendorNames, sourceDomains, breeders };
}

export function provenanceFingerprint(p) {
  return JSON.stringify({
    breeder: optText(p?.breeder),
    breederLocation: optText(p?.breederLocation),
    sources: cleanSources(p?.sources ?? []),
    photoKey: optText(p?.photoKey),
    photoCredit: optText(p?.photoCredit),
  });
}

export function rawProvenanceFingerprint(p) {
  return JSON.stringify({
    breeder: optText(p?.breeder),
    breederLocation: optText(p?.breederLocation),
    sources: (p?.sources ?? []).map((s) => ({
      vendorName: String(s.vendorName ?? ""),
      url: String(s.url ?? ""),
    })),
    photoKey: optText(p?.photoKey),
    photoCredit: optText(p?.photoCredit),
  });
}

export function cleanProvenanceRecord(existing) {
  const cleanedSources = cleanSources(existing?.sources ?? []);
  const breederRaw = optText(existing?.breeder);
  const breeder = sanitizeBreeder(breederRaw);
  let breederLocation = optText(existing?.breederLocation);

  if (!breeder) {
    breederLocation = null;
  } else if (
    breeder.includes("Towns-End") &&
    breeder.includes("South Florida") &&
    !breederLocation
  ) {
    breederLocation = "South Florida, USA";
  }

  return {
    breeder: breeder ? [breeder] : [],
    breederLocation: breederLocation ? [breederLocation] : [],
    origin: existing?.origin?.length ? existing.origin : [],
    species: existing?.species?.length ? existing.species : [],
    heatClass: existing?.heatClass?.length ? existing.heatClass : [],
    sources: cleanedSources,
    photoKey: existing?.photoKey?.length ? existing.photoKey : [],
    photoCredit: existing?.photoCredit?.length ? existing.photoCredit : [],
  };
}
