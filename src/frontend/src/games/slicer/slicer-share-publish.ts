/**
 * Dual-audience Slicer share publish — SPA shell + OG meta + per-score plaque PNG.
 */
import type { Backend } from "@/backend";
import { requireBackendRaw } from "@/lib/backend-raw";
import {
  ogTitle,
  scoreToTierSlug,
  tauntForTier,
  tierOgImage,
  type SlicerTierSlug,
} from "./slicer-share-copy";
import { renderSlicerShareOgPng } from "./render-slicer-share-og";
import { scoreToTier } from "./constants";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SharePublishInput = {
  principalText: string;
  username: string;
  score: number;
  lastPlayedNs: bigint;
  shareUrl: string;
};

function stripShareMetaTags(html: string): string {
  return html
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
}

export function injectShareMetaIntoSpaShell(
  shell: string,
  input: SharePublishInput & { ogImage: string },
): string {
  const tier = scoreToTierSlug(input.score);
  const title = ogTitle(input.username, input.score);
  const description = tauntForTier(tier, input.score);
  const escTitle = escapeHtml(title);
  const escDesc = escapeHtml(description);
  const escUrl = escapeHtml(input.shareUrl);
  const escOg = escapeHtml(input.ogImage);

  let html = stripShareMetaTags(shell);
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escTitle}</title>`);
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escDesc}" />`,
  );

  const metaBlock = [
    `<link rel="canonical" href="${escUrl}" />`,
    `<meta property="og:site_name" content="IC SPICY" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escUrl}" />`,
    `<meta property="og:title" content="${escTitle}" />`,
    `<meta property="og:description" content="${escDesc}" />`,
    `<meta property="og:image" content="${escOg}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escTitle}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escTitle}" />`,
    `<meta name="twitter:description" content="${escDesc}" />`,
    `<meta name="twitter:image" content="${escOg}" />`,
    `<meta name="twitter:image:alt" content="${escTitle}" />`,
  ].join("\n    ");

  return html.replace("</head>", `    ${metaBlock}\n  </head>`);
}

export async function fetchSpaIndexShell(): Promise<string> {
  const res = await fetch("/index.html", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load SPA shell (${res.status})`);
  return res.text();
}

export async function publishSlicerShare(
  actor: Backend,
  input: SharePublishInput,
): Promise<{ ok: { url: string; score: bigint } } | { err: string }> {
  const raw = requireBackendRaw(actor);
  const tierSlug = scoreToTierSlug(input.score) as SlicerTierSlug;
  const tierLabel = scoreToTier(input.score);

  let ogImage = tierOgImage(tierSlug);
  try {
    const pngBlob = await renderSlicerShareOgPng({
      score: input.score,
      username: input.username,
      tierLabel,
    });
    const bytes = new Uint8Array(await pngBlob.arrayBuffer());
    const uploadRes = (await raw.storeSlicerShareOgImage(bytes)) as {
      ok?: string;
      err?: string;
    };
    if (uploadRes.ok && uploadRes.ok.startsWith("https://")) {
      ogImage = uploadRes.ok;
    }
  } catch {
    /* fallback to static tier card */
  }

  let shell: string;
  try {
    shell = await fetchSpaIndexShell();
  } catch (e) {
    return {
      err: e instanceof Error ? e.message : "Failed to load SPA shell",
    };
  }

  const html = injectShareMetaIntoSpaShell(shell, { ...input, ogImage });
  const result = (await raw.publishSlicerSharePage(html)) as {
    ok?: { url: string; score: bigint };
    err?: string;
  };
  if (result.err != null) return { err: result.err };
  if (!result.ok) return { err: "Invalid response" };
  return { ok: result.ok };
}
