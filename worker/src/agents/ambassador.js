// Captain Capsaicin — cross-dapp ambassador agent.
//
// Flow per platform job:
//   1. Engage: read the platform feed, auto-react to a few quality posts
//      (cheap, low-risk), then auto-publish daily posts and comment replies.
//   2. Standalone posts auto-publish (Community + Crumbeatr + SWOP) with a
//      unique OWNER-PAID MiniRouter image — fail closed if image missing.
//   3. Comment replies auto-publish on Community, Crumbeatr, and SWOP (capped).
//   4. publishApprovedAmbassadorDrafts() drains legacy approved drafts only.
//   5. sweepAmbassadorFunds() moves earned tokens/tips above a small float to
//      the admin-set `ambassador_sweep_principal`.
//
// SWOP activates once swop_backend_canister_id is set. BonsaiOS uses a
// SEPARATE Canopy wallet (ctx.walletBook / canopy_wallet_principal) for CRM,
// mint, and trade — never assume captain_operating is the Bonsai identity.

import { Principal } from "@dfinity/principal";
import { kindVariant, kindKey } from "../idl/agent-hub.js";
import { bladeGrovePostPrompt } from "../lib/persona.js";
import { bonsaiPrincipal } from "../lib/wallets.js";
import {
  createCrumbeatrClient,
  REACTION_HEART,
} from "../clients/crumbeatr.js";
import { createSwopClient, SWOP_CORE, SWOP_SOCIAL } from "../clients/swop.js";
import {
  createBonsaiClient,
  BONSAI_REGISTRY,
  ORBIT_SPOTS_MINT_E8S,
} from "../clients/bonsai.js";
import {
  createBladeGroveClient,
  playStory,
  statusSnapshot,
} from "../clients/blade-grove/index.js";
import { prepareCaptainPostMedia } from "../lib/images/captain-post-image.js";
import { patchCaptainProofPosts } from "../lib/images/host-frontend.js";
import { publishCaptainStandalonePost } from "../lib/captain-publish.js";
import { attemptCaptainStandaloneDailyPost } from "../lib/captain-standalone-daily.js";
import { standaloneSlotsRemainingTodayET } from "../lib/captain-daily.js";
import { runCaptainCommentReplies } from "../lib/captain-replies.js";
import { runHederaTwinSync } from "../lib/hedera-twin-sync.js";
import { runHederaCollectorTick } from "../lib/hedera-collector.js";

const MAX_AUTO_REACTIONS = 3;
const MAX_AUTO_LIKES = 3;
const ICP_OPERATING_FLOAT_E8S = 100_000_000n; // keep 1.0 ICP for credits + SWOP fees
const CRUMB_FLOAT_FEES = 200n; // keep 200×fee CRUMB for tipping

function parseJsonLoose(text) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function runAmbassador(ctx, key) {
  const payload = parseJsonLoose(String(ctx.job?.payload ?? "")) || {};
  const action = payload.action;

  // Cross-cutting admin actions (any Capsaicin agent id can carry them)
  if (action === "sweep") {
    await sweepAmbassadorFunds({
      secrets: ctx.secrets,
      captainIdentity: ctx.captainIdentity,
    });
    await ctx.hub.reportRun(kindVariant(key), `${key}: sweep completed`);
    return null;
  }

  switch (key) {
    case "ambassador_crumbeatr":
      return runCrumbeatr(ctx);
    case "ambassador_swop":
      return runSwop(ctx);
    case "ambassador_bonsai":
      return runBonsaiGate(ctx, key, payload);
    default:
      throw new Error(`Not an ambassador kind: ${key}`);
  }
}

/** BonsaiOS: mint-first Orbit, CRM pulse, NFT transfer, Blade Grove Arena. */
async function runBonsaiGate(ctx, key, payload = {}) {
  const { hub, secrets, captainIdentity, walletBook, job } = ctx;
  const book = walletBook;
  const canopy =
    (book ? bonsaiPrincipal(book) : null) ||
    secrets.canopy_wallet_principal?.trim() ||
    process.env.CANOPY_WALLET_PRINCIPAL?.trim() ||
    null;
  if (!canopy) {
    console.log(
      `[ambassador] bonsai: Canopy wallet not set yet (pending_login).`,
    );
    return awaitingIntegration(ctx, key, "canopy_wallet_principal");
  }

  const client = await createBonsaiClient({ identity: captainIdentity });
  const action = payload.action || "status";

  if (action === "transfer_nft") {
    const tokenId = payload.tokenId ?? payload.token_id;
    const to = payload.to;
    if (!tokenId || !to) throw new Error("transfer_nft requires tokenId + to");
    const tx = await client.transferNft(tokenId, to);
    const msg = `${key}: transferred NFT ${tokenId} → ${to} (result ${tx})`;
    console.log(`[ambassador] ${msg}`);
    await hub.reportRun(kindVariant(key), msg);
    return null;
  }

  if (action === "mint_orbit") {
    const maxQty = BigInt(payload.maxQty ?? 1);
    const minted = await client.mintPhase({
      quantity: 1n,
      maxQty,
      maxUnitE8s: ORBIT_SPOTS_MINT_E8S,
    });
    const msg =
      `${key}: minted Orbit Spot token=${minted.tokenId} serial=${minted.serial} ` +
      `paid=${minted.priceE8s}e8s (mint-first, not floor buy)`;
    console.log(`[ambassador] ${msg}`);
    await hub.reportRun(kindVariant(key), msg);
    return null;
  }

  if (
    action === "blade_grove_status" ||
    action === "play_blade_grove" ||
    action === "open_packs"
  ) {
    return runBladeGrove(ctx, key, payload);
  }

  // Default / timer: status + mint-first if under target holdings
  const registryId =
    secrets.bonsai_registry_canister_id?.trim() || BONSAI_REGISTRY;
  const crm = await client.getCrmStatus();
  const orbitBal = await client.orbitBalance();
  const icpBal = await client.icpBalance();
  const targetHoldings = BigInt(payload.targetOrbit ?? secrets.bonsai_orbit_target ?? 1);

  let mintNote = "no mint";
  if (orbitBal < targetHoldings && action !== "status_only") {
    try {
      const minted = await client.mintPhase({
        quantity: 1n,
        maxQty: 1n,
        maxUnitE8s: ORBIT_SPOTS_MINT_E8S,
      });
      mintNote = `minted token=${minted.tokenId} serial=${minted.serial}`;
    } catch (err) {
      mintNote = `mint skipped: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else if (orbitBal >= targetHoldings) {
    mintNote = `holdings ${orbitBal} ≥ target ${targetHoldings}`;
  }

  let twinNote = "";
  try {
    const twin = await runHederaTwinSync();
    twinNote = ` twinSync=${JSON.stringify(twin)}`;
  } catch (err) {
    twinNote = ` twinSync_err=${err instanceof Error ? err.message : String(err)}`;
  }

  let collectNote = "";
  try {
    const collect = await runHederaCollectorTick({ maxHbar: 50 });
    collectNote = ` collect=${JSON.stringify(collect.alerts?.slice(0, 2) ?? [])}`;
  } catch (err) {
    collectNote = ` collect_err=${err instanceof Error ? err.message : String(err)}`;
  }

  const msg =
    `${key}: Canopy ${canopy.slice(0, 12)}… registry=${registryId} ` +
    `crm(profile=${crm.hasProfile},score=${crm.score}) ` +
    `orbitSpots=${await client.orbitBalance()} icpE8s=${await client.icpBalance()} ` +
    `job=${job?.id ?? "?"} ${mintNote}${twinNote}${collectNote}`;
  console.log(`[ambassador] ${msg}`);
  await hub.reportRun(kindVariant(key), msg);
  return null;
}

async function runBladeGrove(ctx, key, payload) {
  const { hub, secrets, captainIdentity, llm, llmCompliance } = ctx;
  const action = payload.action;
  const bga = await createBladeGroveClient({ identity: captainIdentity });

  if (action === "blade_grove_status") {
    const chain = await bga.onChainStatus();
    const story = statusSnapshot();
    const msg =
      `${key}: Blade Grove status packs(w=${chain.packCredits.warden},c=${chain.packCredits.captain}) ` +
      `sealed=${chain.sealedPackTokenIds.length} playable=${chain.playableCardIds.length} ` +
      `story ${story.cleared}/${story.totalNodes} sap=${story.sap} record=${story.wins}-${story.losses} ` +
      `pending=${story.pending.slice(0, 3).join(",") || "none"} stakesOpen=${chain.stakesOpen}`;
    console.log(`[ambassador] ${msg}`);
    await hub.reportRun(kindVariant(key), msg);
    return null;
  }

  if (action === "open_packs") {
    const opened = await bga.openAllPacks();
    const msg =
      `${key}: opened ${opened.opened.length} pack(s); playable now ${opened.playableCardIds.length}` +
      (opened.notes.length ? `; notes=${opened.notes.slice(0, 3).join(" | ")}` : "");
    console.log(`[ambassador] ${msg}`);
    await hub.reportRun(kindVariant(key), msg);
    return null;
  }

  // play_blade_grove
  let packNote = "no packs";
  try {
    const opened = await bga.openAllPacks();
    if (opened.opened.length) {
      packNote = `opened ${opened.opened.length} pack(s) → +${opened.opened.reduce((n, o) => n + o.cardIds.length, 0)} cards`;
    } else if (opened.notes.length) {
      packNote = `packs: ${opened.notes[0]}`;
    }
  } catch (err) {
    packNote = `pack open skipped: ${err instanceof Error ? err.message : String(err)}`;
  }

  let chainCards = [];
  try {
    const chain = await bga.onChainStatus();
    chainCards = chain.playableCardIds;
  } catch {
    /* story still works offline */
  }

  const maxNodes = Number(payload.maxNodes ?? payload.max_nodes ?? 3);
  const session = playStory({
    maxNodes,
    extraCardIds: chainCards,
    seedBase: Date.now(),
  });

  const publishNote = await autoPublishBladeGrove(ctx, session);
  const msg =
    `${key}: Blade Grove play — ${session.summary} (${packNote}); ${publishNote}`;
  console.log(`[ambassador] ${msg}`);
  await hub.reportRun(kindVariant(key), msg);
  return null;
}

/** Compliance-gated auto-publish to Crumbeatr + SWOP (no draft queue). */
async function autoPublishBladeGrove(ctx, session) {
  const { llm, hub, job } = ctx;
  if (!session.results?.some((r) => r.won)) {
    return "no wins — skipped social posts";
  }

  const prompt = bladeGrovePostPrompt({
    platform: "Crumbeatr, The Swop, and IC SPICY Community Garden",
    summary: session.summary,
    results: session.results,
  });
  let body = "";
  try {
    body = String(await llm.complete(prompt)).trim();
  } catch (err) {
    return `LLM draft failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  if (!body || body.length < 20) return "empty LLM body — skipped posts";

  try {
    const { notes } = await publishCaptainStandalonePost(ctx, body);
    await hub.reportRun(
      kindVariant("ambassador_bonsai"),
      `Blade Grove auto-published: ${notes}`,
    );
    return notes;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await hub.reportRun(
      kindVariant("ambassador_bonsai"),
      `Blade Grove publish failed: ${msg}`,
    );
    return msg;
  }
}

async function awaitingIntegration(ctx, key, secretName) {
  const { hub, secrets } = ctx;
  const configured = Boolean(secrets[secretName]);
  await hub.reportRun(
    kindVariant(key),
    configured
      ? `${key}: backend configured but client not yet wired — pending integration`
      : `${key}: awaiting platform integration (set secret ${secretName})`,
  );
  return null;
}

async function runCrumbeatr(ctx) {
  const { hub, llm, secrets, job, captainIdentity } = ctx;
  if (!captainIdentity) throw new Error("captain identity missing from ctx");

  const replyResult = await runCaptainCommentReplies(ctx);
  const replyNote =
    replyResult.replied > 0
      ? `replied=${replyResult.replied}`
      : "replies=0";

  const client = await createCrumbeatrClient({
    identity: captainIdentity,
    canisterId: secrets.crumbeatr_canister_id || undefined,
  });

  const profile = await client.myProfile();
  if (!profile) {
    await hub.reportRun(
      kindVariant("ambassador_crumbeatr"),
      "Captain Capsaicin is not registered on Crumbeatr yet — run `node worker/scripts/register-crumbeatr.js`",
    );
    return null;
  }
  const myId = profile.id;

  const feed = (await client.hotPosts(0)) ?? [];
  const candidates = feed
    .filter((p) => p.user !== myId)
    .filter((p) => typeof p.body === "string" && p.body.length > 20)
    .slice(0, 12);

  let reacted = 0;
  for (const post of candidates) {
    if (reacted >= MAX_AUTO_REACTIONS) break;
    const reactionUserIds = Object.values(post.reactions ?? {}).flat();
    if (reactionUserIds.includes(myId)) continue;
    try {
      const res = await client.react(post.id, REACTION_HEART);
      if (res && res.Err) throw new Error(res.Err);
      reacted++;
    } catch (err) {
      console.warn(`[ambassador] react on ${post.id} failed: ${err.message}`);
      break;
    }
  }

  const notes = [replyNote, `reacted=${reacted}`];

  if (!llm) {
    await hub.reportRun(
      kindVariant("ambassador_crumbeatr"),
      notes.join("; ") + "; no LLM — skipped daily post",
    );
    return null;
  }

  if (standaloneSlotsRemainingTodayET() > 0) {
    const daily = await attemptCaptainStandaloneDailyPost(ctx, {
      contextPrefix: `Reacted to ${reacted} Crumbeatr posts this run. `,
      skipHubReport: true,
    });
    if (daily.ok) {
      notes.push(daily.summary);
    } else if (daily.reason === "duplicate_body") {
      notes.push(`daily=skipped(duplicate after retry, ${daily.slotLabel})`);
    } else if (daily.reason === "publish_failed") {
      notes.push(`daily_${daily.slotLabel}_failed=${daily.error}`);
    } else if (daily.reason !== "all_slots_filled") {
      notes.push(`daily=skipped(${daily.reason})`);
    }
  } else {
    notes.push("daily=skipped(all ET slots filled today)");
  }

  await hub.reportRun(kindVariant("ambassador_crumbeatr"), notes.join("; "));
  return notes;
}

async function runSwop(ctx) {
  const { hub, llm, secrets, job, captainIdentity } = ctx;
  if (!captainIdentity) throw new Error("captain identity missing from ctx");

  const replyResult = await runCaptainCommentReplies(ctx);
  const notes = [
    replyResult.replied > 0
      ? `replied=${replyResult.replied}`
      : "replies=0",
  ];

  const client = await createSwopClient({
    identity: captainIdentity,
    coreId: secrets.swop_backend_canister_id || SWOP_CORE,
    socialId: secrets.swop_social_canister_id || SWOP_SOCIAL,
  });

  const user = await client.getUser();
  if (!user) {
    await hub.reportRun(
      kindVariant("ambassador_swop"),
      "Captain Capsaicin is not registered on SWOP yet — run `node worker/scripts/register-swop.js`",
    );
    return null;
  }

  const feed = await client.publicFeed(20n);
  const meText = client.principal.toText();
  const candidates = (feed || [])
    .filter((p) => !p.deleted && p.author?.toText?.() !== meText)
    .filter((p) => typeof p.content === "string" && p.content.length > 20)
    .slice(0, 12);

  let liked = 0;
  for (const post of candidates) {
    if (liked >= MAX_AUTO_LIKES) break;
    try {
      await client.addLike(post.id);
      liked++;
    } catch (err) {
      console.warn(`[ambassador] swop like ${post.id} failed: ${err.message}`);
      break;
    }
  }
  notes.push(`liked=${liked}`);
  notes.push("daily=coordinator(crumbeatr agent)");

  await hub.reportRun(kindVariant("ambassador_swop"), notes.join("; "));
  return notes;
}

// ── Publish approved drafts ───────────────────────────────────────────────────

export async function publishApprovedAmbassadorDrafts({
  hub,
  secrets,
  captainIdentity,
}) {
  if (!captainIdentity) return;
  let drafts;
  try {
    drafts = await hub.getApprovedDraftsForSend(50n);
  } catch {
    return;
  }
  const ambassadorDrafts = drafts.filter((d) =>
    kindKey(d.agentKind).startsWith("ambassador_"),
  );
  if (ambassadorDrafts.length === 0) return;

  let crumbClient = null;
  let swopClient = null;
  for (const draft of ambassadorDrafts) {
    const kind = kindKey(draft.agentKind);
    let meta = {};
    try {
      meta = JSON.parse(draft.metadata || "{}");
    } catch {}
    try {
      if (kind === "ambassador_crumbeatr") {
        crumbClient ??= await createCrumbeatrClient({
          identity: captainIdentity,
          canisterId: secrets.crumbeatr_canister_id || undefined,
        });
        const parent = meta.action === "comment" ? meta.parent : null;
        let postBody = draft.body;
        let blobs = [];
        let powNote = "";
        let mediaBlobId = null;
        let shareUrl = null;
        if (meta.action !== "comment") {
          const media = await prepareCaptainPostMedia(draft.body, {
            platform: "crumbeatr",
          });
          postBody = media.bodyCrumbeatr;
          blobs = media.crumbeatrBlobs;
          if (media.pow) powNote = media.pow;
          mediaBlobId = media.blobId || null;
          shareUrl = media.shareUrl || null;
        }
        const postId = await crumbClient.addPost(postBody, {
          parent,
          blobs,
        });
        await hub.markDraftSent(draft.id);
        if (powNote && mediaBlobId) {
          try {
            await patchCaptainProofPosts(mediaBlobId, {
              crumbeatr: String(postId),
            });
          } catch (err) {
            console.warn(
              `[ambassador] proof patch crumbeatr failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        }
        const crumbMsg =
          `published draft ${draft.id} → crumbeatr#${postId}` +
          (powNote ? `; ${powNote}` : "") +
          (shareUrl ? `; share=${shareUrl}` : "");
        console.log(`[ambassador] ${crumbMsg}`);
        await hub.reportRun(kindVariant(kind), crumbMsg);
      } else if (kind === "ambassador_swop") {
        swopClient ??= await createSwopClient({
          identity: captainIdentity,
          coreId: secrets.swop_backend_canister_id || SWOP_CORE,
          socialId: secrets.swop_social_canister_id || SWOP_SOCIAL,
        });
        if (meta.action === "comment" && meta.postId) {
          const c = await swopClient.addComment(meta.postId, draft.body);
          await hub.markDraftSent(draft.id);
          console.log(
            `[ambassador] published draft ${draft.id} → swop comment ${c.id}`,
          );
        } else {
          const media = await prepareCaptainPostMedia(draft.body, {
            platform: "swop",
          });
          const post = await swopClient.createPost(media.bodySwop, {
            mediaUrl: media.imageUrl && !media.mock ? media.imageUrl : null,
            mimeType: "image/jpeg",
          });
          await hub.markDraftSent(draft.id);
          if (media.blobId && !media.mock) {
            try {
              await patchCaptainProofPosts(media.blobId, {
                swop: String(post.id),
              });
            } catch (err) {
              console.warn(
                `[ambassador] proof patch swop failed: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              );
            }
          }
          const swopMsg =
            `published draft ${draft.id} → swop#${post.id}` +
            (media.pow ? `; ${media.pow}` : media.mock ? "; image=mock" : "") +
            (media.imageUrl && !media.mock ? "; swop_media=ref" : "") +
            (media.shareUrl ? `; share=${media.shareUrl}` : "");
          console.log(`[ambassador] ${swopMsg}`);
          await hub.reportRun(kindVariant(kind), swopMsg);
        }
      } else {
        console.log(
          `[ambassador] draft ${draft.id} (${kind}) approved but platform not integrated yet`,
        );
      }
    } catch (err) {
      console.error(
        `[ambassador] publish draft ${draft.id} failed: ${err.message}`,
      );
    }
  }
}

// ── Sweep earnings/tips to admin ──────────────────────────────────────────────

export async function sweepAmbassadorFunds({ secrets, captainIdentity }) {
  if (!captainIdentity) return;
  const destText = secrets.ambassador_sweep_principal;
  if (!destText) return;
  let dest;
  try {
    dest = Principal.fromText(destText.trim());
  } catch {
    console.warn("[ambassador] ambassador_sweep_principal is not a valid principal");
    return;
  }

  try {
    const client = await createCrumbeatrClient({
      identity: captainIdentity,
      canisterId: secrets.crumbeatr_canister_id || undefined,
    });

    // CRUMB above tipping float → admin
    const [crumbBal, crumbFee] = await Promise.all([
      client.crumbBalance(),
      client.crumbFee(),
    ]);
    const crumbFloat = CRUMB_FLOAT_FEES * crumbFee;
    if (crumbBal > crumbFloat + crumbFee) {
      const amount = crumbBal - crumbFloat - crumbFee;
      await client.crumbTransfer(dest, amount);
      console.log(`[ambassador] swept ${amount} CRUMB (raw) to ${destText}`);
    }

    // ICP above operating float → admin
    const icpBal = await client.icpBalance();
    if (icpBal > ICP_OPERATING_FLOAT_E8S + 10_000n) {
      const amount = icpBal - ICP_OPERATING_FLOAT_E8S - 10_000n;
      await client.icpTransfer(dest, amount);
      console.log(`[ambassador] swept ${amount} e8s ICP to ${destText}`);
    }
  } catch (err) {
    console.error(`[ambassador] sweep failed: ${err.message}`);
  }
}
