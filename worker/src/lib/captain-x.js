import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { postCaptainTweet, xCaptainConfigured } from "../clients/x-captain.js";
import { captainPostUrls } from "./captain-post-urls.js";
import { easternDateKey, STANDALONE_SLOTS_PER_DAY } from "./captain-daily.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH =
  process.env.CAPTAIN_X_STATE?.trim() ||
  join(__dirname, "../../data/captain-x.json");

function readState() {
  try {
    if (!existsSync(STATE_PATH)) return { days: {}, byBlob: {} };
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return {
      days: raw.days && typeof raw.days === "object" ? raw.days : {},
      byBlob: raw.byBlob && typeof raw.byBlob === "object" ? raw.byBlob : {},
    };
  } catch {
    return { days: {}, byBlob: {} };
  }
}

function writeState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function tweetsTodayCount() {
  const key = easternDateKey();
  const state = readState();
  return state.days[key]?.count ?? 0;
}

function canTweetToday() {
  return tweetsTodayCount() < STANDALONE_SLOTS_PER_DAY;
}

function markTweeted(blobId, meta) {
  const key = easternDateKey();
  const state = readState();
  if (!state.days[key]) state.days[key] = { count: 0, tweets: [] };
  state.days[key].count = (state.days[key].count ?? 0) + 1;
  state.days[key].tweets = state.days[key].tweets ?? [];
  state.days[key].tweets.push({ at: new Date().toISOString(), ...meta });
  if (blobId) state.byBlob[blobId] = meta.tweetUrl ?? meta.tweetId;
  writeState(state);
}

/**
 * Teaser tweet after a successful Captain bundle publish.
 * @param {object} ctx — secrets, llm optional
 * @param {{
 *   body: string,
 *   media: { imageUrl?: string|null, blobId?: string|null },
 *   crumbeatrPostId: string|number,
 *   swopPostId: string,
 * }} pub
 */
export async function promoteCaptainPublishOnX(ctx, pub) {
  const { secrets, llm } = ctx;
  if (!xCaptainConfigured(secrets)) {
    return { skipped: true, reason: "x_not_configured" };
  }
  const blobId = pub.media?.blobId;
  if (blobId) {
    const state = readState();
    if (state.byBlob[blobId]) {
      return { skipped: true, reason: "already_tweeted", url: state.byBlob[blobId] };
    }
  }
  if (!canTweetToday()) {
    return { skipped: true, reason: "daily_cap" };
  }

  const urls = captainPostUrls({
    crumbeatrPostId: pub.crumbeatrPostId,
    swopPostId: pub.swopPostId,
  });
  if (!urls.swop || !urls.crumbeatr) {
    return { skipped: true, reason: "missing_post_urls" };
  }

  let teaser = "";
  if (llm) {
    teaser = String(
      await llm.complete(
        `Write ONE X/Twitter teaser for Captain Capsaicin (max 200 characters, no hashtags spam). ` +
          `Hook about peppers, ICP, or natural farming. Do NOT include URLs — they will be appended.\n\n` +
          `Full post excerpt:\n${pub.body.slice(0, 400)}`,
      ),
    ).trim();
  }
  if (!teaser) {
    teaser = "Fresh from the bridge — Captain Capsaicin just dropped a new post.";
  }
  teaser = teaser.replace(/\s+/g, " ").slice(0, 200);
  const text = `${teaser}\n\nSWOP: ${urls.swop}\nCrumbeatr: ${urls.crumbeatr}`.slice(
    0,
    280,
  );

  try {
    const { url, tweetId } = await postCaptainTweet(secrets, {
      text,
      imageUrl: pub.media?.imageUrl,
    });
    markTweeted(blobId, { tweetId, tweetUrl: url, swop: urls.swop, crumbeatr: urls.crumbeatr });
    return { ok: true, url, tweetId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[captain-x] tweet failed: ${msg}`);
    return { ok: false, error: msg };
  }
}
