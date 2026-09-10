// Register Captain Capsaicin on SWOP (core + avatar + optional first post).
//
//   node scripts/register-swop.js
//   node scripts/register-swop.js --status
//   node scripts/register-swop.js --post

import "dotenv/config";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCaptainIdentity, loadMnemonicFromEnv } from "../src/identity.js";
import { createSwopClient } from "../src/clients/swop.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATUS_ONLY = process.argv.includes("--status");
const DO_POST = process.argv.includes("--post");

async function main() {
  const identity = await loadCaptainIdentity(loadMnemonicFromEnv());
  const swop = await createSwopClient({ identity });
  console.log(`captain: ${swop.principal.toText()}`);

  let user = await swop.getUser();
  if (user) {
    console.log(
      `already registered: ${user.username?.[0] ?? "(no username)"} @ ${user.id.toText()}`,
    );
  } else if (!STATUS_ONLY) {
    user = await swop.ensureRegistered("CaptainCapsaicin");
    console.log(
      `registered: ${user.username?.[0] ?? "(no username)"} @ ${user.id.toText()}`,
    );
  } else {
    console.log("not registered");
    return;
  }

  if (STATUS_ONLY) return;

  const avatar = join(HERE, "..", "assets", "captain-capsaicin-256.jpg");
  try {
    await swop.setAvatarFromFile(avatar, "image/jpeg");
    console.log("avatar set");
  } catch (e) {
    console.warn(`avatar failed: ${e.message}`);
  }

  if (DO_POST) {
    const post = await swop.createPost(
      "Captain Capsaicin online on The Swop. Regenerative heat, rare peppers, and the IC SPICY Weather Desk — charted from living soil. Glad to be in the crew. 🌶️\n\nhttps://icspicy.app",
    );
    console.log(`posted: ${post.id}`);
  }
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
