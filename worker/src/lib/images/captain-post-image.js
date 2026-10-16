/**
 * Build Capsaicin post image + platform attachments.
 *
 * OWNER-PAID ONLY — MiniRouter spend is owner pre-funded credits.
 * Standalone posts fail closed when live image generation/upload fails.
 */

import { editCaptainImage } from "../../clients/minirouter-images.js";
import {
  buildCaptainPrompt,
  sceneFromPostBody,
} from "../captain-image-prompt.js";
import { makeBlobId, toJpegUnder } from "./jpeg-compress.js";
import {
  uploadCaptainPostJpeg,
  writeCaptainProof,
} from "./host-frontend.js";
import { pixelArtFromJpeg } from "./pixel-art.js";

function inferMood(body) {
  const t = String(body || "").toLowerCase();
  if (/blade grove|arena|siege|chronicle|bonsai/.test(t)) return "gaming";
  if (/garden|soil|seed|pepper|grow|j adam|fpj/.test(t)) return "garden";
  if (/win|clear|victory|celebrate|congrats/.test(t)) return "celebrating";
  if (/how to|tip|lesson|explain|science/.test(t)) return "educational";
  return "flex";
}

/**
 * Compact proof string for hub audit / admin UI.
 * Parse key=value pairs after the `captain_pow:` prefix.
 *
 * @param {{
 *   requestId?: string|null,
 *   model?: string|null,
 *   costEstimate?: number|null,
 *   mock?: boolean,
 *   imageUrl?: string|null,
 *   blobId?: string|null,
 *   jpegBytes?: number|null,
 * }} p
 * @returns {string|null}
 */
export function formatCaptainPow(p) {
  if (!p || p.mock) return null;
  const parts = [];
  if (p.requestId) parts.push(`minirouter=${p.requestId}`);
  if (p.model) parts.push(`model=${p.model}`);
  if (p.costEstimate != null && Number.isFinite(Number(p.costEstimate))) {
    parts.push(`est=$${Number(p.costEstimate)}`);
  }
  parts.push("mock=0");
  if (p.imageUrl) parts.push(`icp=${p.imageUrl}`);
  if (p.blobId) parts.push(`blob=${p.blobId}`);
  if (p.jpegBytes != null) parts.push(`jpeg=${p.jpegBytes}B`);
  if (!parts.some((x) => x.startsWith("minirouter=") || x.startsWith("icp="))) {
    return null;
  }
  return `captain_pow:${parts.join(";")}`;
}

/**
 * @param {string} body
 * @param {{ platform: "crumbeatr"|"swop"|"both", dryRun?: boolean, force?: boolean }} opts
 * @returns {Promise<{
 *   bodyCrumbeatr: string,
 *   bodySwop: string,
 *   crumbeatrBlobs: Array<[string, number[]]>,
 *   imageUrl: string|null,
 *   blobId: string|null,
 *   requestId: string|null,
 *   model: string|null,
 *   costEstimate: number|null,
 *   jpegBytes: number|null,
 *   pow: string|null,
 *   skipped: boolean,
 *   mock?: boolean,
 *   skipReason?: string,
 * }>}
 */
export async function prepareCaptainPostMedia(body, opts = {}) {
  const platform = opts.platform || "both";
  const requireImage = opts.requireImage !== false;
  const text = String(body || "");

  const base = {
    bodyCrumbeatr: text,
    bodySwop: text,
    crumbeatrBlobs: [],
    imageUrl: null,
    blobId: null,
    requestId: null,
    model: null,
    costEstimate: null,
    jpegBytes: null,
    pow: null,
    skipped: true,
  };

  try {
    const scene = sceneFromPostBody(text);
    const mood = inferMood(text);
    const prompt = buildCaptainPrompt(scene, {
      mood,
      seed: `${Date.now()}|${text.slice(0, 120)}`,
    });
    const img = await editCaptainImage(prompt, {
      dryRun: Boolean(opts.dryRun),
      force: Boolean(opts.force),
    });
    let jpeg = await toJpegUnder(img.bytes);
    if (/icpixel|pixel art|pixel-art/i.test(text) || opts.pixelArt) {
      try {
        const pix = await pixelArtFromJpeg(jpeg.bytes);
        jpeg = { bytes: pix, contentType: "image/jpeg" };
      } catch (err) {
        console.warn(
          `[captain-image] pixel-art pass skipped: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    const blobId = makeBlobId(img.requestId || Date.now());
    const requestId = img.requestId ? String(img.requestId) : null;
    const model = img.model ? String(img.model) : null;
    const costEstimate =
      img.costEstimate != null ? Number(img.costEstimate) : null;

    // Always host on ICP when live — proof-of-work + SWOP embed URL.
    let imageUrl = null;
    let proofRecord = null;
    try {
      if (!img.mock) {
        const up = await uploadCaptainPostJpeg(jpeg.bytes, `${blobId}.jpg`);
        imageUrl = up.url;
        try {
          proofRecord = await writeCaptainProof({
            id: blobId,
            at: new Date().toISOString(),
            imageUrl: up.url,
            minirouter: {
              requestId,
              model,
              costEstimate,
              activityUrl: "https://minirouter.sh",
            },
            icp: {
              canisterId: up.canisterId,
              imageUrl: up.url,
              imageKey: up.key,
              jpegBytes: jpeg.bytes.length,
            },
            posts: { crumbeatr: null, swop: null, community: null },
          });
        } catch (err) {
          console.warn(
            `[captain-image] proof json upload failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        imageUrl = `https://example.invalid/mock/${blobId}.jpg`;
      }
    } catch (err) {
      console.warn(
        `[captain-image] frontend upload failed (ICP proof / SWOP image missing): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    if (requireImage && img.mock) {
      throw new Error(
        "Captain image required: MINIROUTER_IMAGE_MOCK is enabled",
      );
    }

    if (requireImage && !img.mock && !imageUrl) {
      throw new Error(
        "Captain image required: MiniRouter succeeded but ICP JPEG upload failed",
      );
    }

    // Taggr/Crumbeatr only renders blobs via markdown image syntax
    // (`![alt](/blob/id)`). Bare `/blob/id` stays plain text.
    const crumbBody =
      platform === "swop"
        ? text
        : `${text.trim()}\n\n![Captain Capsaicin](/blob/${blobId})`;
    // SWOP renders native mediaRef (https URL as mediaId), not markdown images.
    // Keep body text-only for SWOP so the link doesn't appear as raw markdown.
    const swopBody = text.trim();

    const crumbeatrBlobs =
      platform === "swop"
        ? []
        : /** @type {Array<[string, number[]]>} */ ([
            [blobId, [...jpeg.bytes]],
          ]);

    const pow = formatCaptainPow({
      requestId,
      model,
      costEstimate,
      mock: Boolean(img.mock),
      imageUrl: img.mock ? null : imageUrl,
      blobId,
      jpegBytes: jpeg.bytes.length,
    });

    console.log(
      `[captain-image] prepared blob=${blobId} jpeg=${jpeg.bytes.length}B ` +
        `url=${imageUrl ? "yes" : "no"} OWNER-PAID=${!img.mock}` +
        (pow ? ` ${pow}` : ""),
    );

    return {
      bodyCrumbeatr: crumbBody,
      bodySwop: swopBody,
      crumbeatrBlobs,
      imageUrl,
      blobId,
      requestId,
      model,
      costEstimate,
      jpegBytes: jpeg.bytes.length,
      jpeg: jpeg.bytes,
      pow,
      proof: proofRecord,
      shareUrl: proofRecord?.shareUrl ?? null,
      skipped: false,
      mock: Boolean(img.mock),
    };
  } catch (err) {
    const skipReason = err instanceof Error ? err.message : String(err);
    if (requireImage) {
      throw new Error(`Captain image required: ${skipReason}`);
    }
    console.warn(`[captain-image] skip (text-only): ${skipReason}`);
    return { ...base, skipReason };
  }
}
