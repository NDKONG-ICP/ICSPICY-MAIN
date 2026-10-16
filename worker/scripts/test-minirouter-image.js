#!/usr/bin/env node
/**
 * Smoke-test Captain image pipeline (OWNER-PAID MiniRouter).
 *
 * Mock (no spend):
 *   MINIROUTER_IMAGE_MOCK=true node scripts/test-minirouter-image.js
 *
 * Live edits (spends owner credits):
 *   MINIROUTER_API_KEY=… node scripts/test-minirouter-image.js --live
 */
import "dotenv/config";
import { writeFileSync } from "fs";
import {
  editCaptainImage,
  captainImagesConfig,
} from "../src/clients/minirouter-images.js";
import { buildCaptainPrompt } from "../src/lib/captain-image-prompt.js";
import { toJpegUnder } from "../src/lib/images/jpeg-compress.js";
import { prepareCaptainPostMedia } from "../src/lib/images/captain-post-image.js";

const live = process.argv.includes("--live");
const withPrepare = process.argv.includes("--prepare");
console.log("[config]", captainImagesConfig());

const prompt = buildCaptainPrompt(
  "at the Blade Grove Arena war table after clearing a Chronicle node",
  { mood: "gaming" },
);
console.log("[prompt]", prompt.slice(0, 200) + "…");

if (withPrepare) {
  const media = await prepareCaptainPostMedia(
    "Just cleared Grove Gate in Blade Grove Arena — formation clicked and the Null Bloom flinched. Who else is running Chronicle tonight?",
    { platform: "both", dryRun: !live, force: live },
  );
  console.log("[prepare]", {
    skipped: media.skipped,
    skipReason: media.skipReason,
    imageUrl: media.imageUrl,
    blobCount: media.crumbeatrBlobs?.length,
    crumbTail: media.bodyCrumbeatr.slice(-40),
    swopTail: media.bodySwop.slice(-80),
  });
} else {
  const img = await editCaptainImage(prompt, {
    dryRun: !live,
    force: live,
  });
  const jpeg = await toJpegUnder(img.bytes);
  const outPng = `/tmp/captain-edit-${img.mock ? "mock" : "live"}.png`;
  const outJpg = `/tmp/captain-edit-${img.mock ? "mock" : "live"}.jpg`;
  writeFileSync(outPng, img.bytes);
  writeFileSync(outJpg, jpeg.bytes);
  console.log(
    `[ok] png=${outPng} (${img.bytes.length}B) jpeg=${outJpg} (${jpeg.bytes.length}B) mock=${img.mock}`,
  );
}
