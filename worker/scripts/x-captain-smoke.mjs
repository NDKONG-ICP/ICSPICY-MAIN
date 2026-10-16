#!/usr/bin/env node
/**
 * Smoke-test X Captain credentials from agent_hub (no tweet unless --post).
 *
 *   cd worker && node scripts/x-captain-smoke.mjs
 *   cd worker && node scripts/x-captain-smoke.mjs --post "Captain bridge test"
 */
import "dotenv/config";
import { loadMnemonicFromEnv, loadWorkerIdentity } from "../src/identity.js";
import { createHubActor, loadSecrets } from "../src/clients/hub.js";
import {
  postCaptainTweet,
  xCaptainConfigured,
} from "../src/clients/x-captain.js";

const postArg = process.argv.find((a) => a.startsWith("--post="));
const postText = postArg?.slice("--post=".length);

async function main() {
  const identity = await loadWorkerIdentity(loadMnemonicFromEnv());
  const hub = await createHubActor(identity);
  const secrets = await loadSecrets(hub, [
    "x_captain_client_id",
    "x_captain_client_secret",
    "x_captain_access_token",
    "x_captain_refresh_token",
  ]);

  const required = [
    "x_captain_client_id",
    "x_captain_client_secret",
  ];
  const tokenOk =
    secrets.x_captain_access_token || secrets.x_captain_refresh_token;
  const missing = required.filter((k) => !secrets[k]?.trim());
  if (missing.length || !tokenOk) {
    if (!tokenOk) missing.push("x_captain_access_token or x_captain_refresh_token");
    console.error("X Captain secrets incomplete in agent_hub:");
    for (const k of missing) console.error(`  - missing: ${k}`);
    console.error(
      "\nSave via Admin → Agent Swarm → Secrets, then re-run from worker/:\n" +
        "  node scripts/x-captain-smoke.mjs",
    );
    process.exit(1);
  }
  console.log("[x-smoke] credentials OK");

  if (!postText) {
    console.log("[x-smoke] dry run only — pass --post=\"hello\" to tweet");
    return;
  }

  const { url, tweetId } = await postCaptainTweet(secrets, { text: postText });
  console.log(`[x-smoke] posted ${tweetId} → ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
