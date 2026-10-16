#!/usr/bin/env node
/**
 * One-shot: Captain Capsaicin IC SPICY Community profile (username, bio, avatar, banner).
 *
 * Usage (from worker/):
 *   node scripts/setup-captain-community-profile.js
 *
 * Requires WORKER_MNEMONIC or WORKER_MNEMONIC_FILE (uses derivation index 1).
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { loadCaptainIdentity, loadMnemonicFromEnv } from "../src/identity.js";
import { createCommunityClient } from "../src/clients/community.js";
import { CAPTAIN_PUBLIC_BIO } from "../src/lib/persona.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REF_PNG = join(__dirname, "../assets/captain-capsaicin-ref.png");

async function toAvatarJpeg() {
  return sharp(readFileSync(REF_PNG))
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

async function toBannerJpeg() {
  return sharp(readFileSync(REF_PNG))
    .rotate()
    .resize(1500, 500, { fit: "cover" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function main() {
  const mnemonic = loadMnemonicFromEnv();
  const identity = await loadCaptainIdentity(mnemonic);
  const client = await createCommunityClient({ identity });

  const avatarKey = await client.storeAvatarFile(await toAvatarJpeg());
  const bannerKey = await client.storeProfileBannerFile(await toBannerJpeg());
  await client.setProfileBanner(bannerKey);

  const ok = await client.saveProfile({
    username: "Captain Capsaicin",
    bio: CAPTAIN_PUBLIC_BIO,
    avatar_key: avatarKey,
    location: "Port Charlotte, FL · Zone 10a",
  });

  console.log("Principal:", client.principalText);
  console.log("Profile saved:", ok);
  console.log("Avatar:", avatarKey);
  console.log("Banner:", bannerKey);
  console.log(`Public: https://icspicy.app/u/${client.principalText}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
