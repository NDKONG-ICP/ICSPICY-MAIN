// Captain Capsaicin — cross-dapp ambassador agent.
//
// Flow per platform job:
//   1. Engage: read the platform feed, auto-react to a few quality posts
//      (cheap, low-risk), and let the LLM draft one comment + one standalone
//      post in the Captain Capsaicin voice.
//   2. Every outbound post/comment becomes a hub DRAFT (approval-gated in the
//      admin UI) with metadata describing how to publish it.
//   3. publishApprovedAmbassadorDrafts() runs each tick and pushes approved
//      drafts to the platform.
//   4. sweepAmbassadorFunds() moves earned tokens/tips above a small float to
//      the admin-set `ambassador_sweep_principal`.
//
// SWOP and Bonsai activate automatically once their backend canister IDs are
// set as hub secrets (swop_backend_canister_id / bonsai_registry_canister_id).

import { Principal } from "@dfinity/principal";
import { fullComplianceCheck } from "../lib/compliance.js";
import { kindVariant, kindKey } from "../idl/agent-hub.js";
import {
  engagementPrompt,
  pillarForToday,
  postPrompt,
} from "../lib/persona.js";
import {
  createCrumbeatrClient,
  REACTION_HEART,
} from "../clients/crumbeatr.js";
import { createSwopClient, SWOP_CORE, SWOP_SOCIAL } from "../clients/swop.js";

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
  switch (key) {
    case "ambassador_crumbeatr":
      return runCrumbeatr(ctx);
    case "ambassador_swop":
      return runSwop(ctx);
    case "ambassador_bonsai":
      return awaitingIntegration(ctx, key, "bonsai_registry_canister_id");
    default:
      throw new Error(`Not an ambassador kind: ${key}`);
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
  const { hub, llm, llmCompliance, secrets, job, captainIdentity } = ctx;
  if (!captainIdentity) throw new Error("captain identity missing from ctx");

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
  const credits = profile.cycles ?? profile.credits ?? 0;

  // ── Read feed ─────────────────────────────────────────────────────────────
  const feed = (await client.hotPosts(0)) ?? [];
  const candidates = feed
    .filter((p) => p.user !== myId)
    .filter((p) => typeof p.body === "string" && p.body.length > 20)
    .slice(0, 12);

  // ── Auto-react (hearts are cheap: 2 credits) ──────────────────────────────
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
      break; // likely out of credits — stop trying
    }
  }

  if (!llm) {
    await hub.reportRun(
      kindVariant("ambassador_crumbeatr"),
      `Engaged (${reacted} reactions); no LLM configured, skipping drafts`,
    );
    return null;
  }

  let draftIds = [];

  // ── Draft one comment on the best candidate ───────────────────────────────
  if (candidates.length > 0) {
    await hub.recordLlmCall(job.agentId);
    const authors = candidates.map((p) => ({
      id: p.id,
      author: p.meta?.author_name ?? String(p.user),
      body: p.body,
    }));
    const raw = await llm.complete(
      engagementPrompt({ platform: "Crumbeatr", posts: authors }),
    );
    const pick = parseJsonLoose(raw);
    if (
      pick &&
      Number.isInteger(pick.index) &&
      pick.index >= 0 &&
      pick.index < candidates.length &&
      pick.comment
    ) {
      const target = candidates[pick.index];
      const compliance = await fullComplianceCheck(
        llmCompliance ?? llm,
        pick.comment,
      );
      const id = await hub.submitDraft(
        kindVariant("ambassador_crumbeatr"),
        [job.id],
        `Comment on Crumbeatr post #${target.id}`,
        pick.comment,
        ["crumbeatr"],
        compliance.passed,
        compliance.notes,
        JSON.stringify({ action: "comment", parent: Number(target.id) }),
      );
      draftIds.push(id);
    }
  }

  // ── Draft one standalone post ─────────────────────────────────────────────
  await hub.recordLlmCall(job.agentId);
  const body = await llm.complete(
    postPrompt({
      platform: "Crumbeatr",
      pillarHint: pillarForToday(),
      contextNote: `Captain currently has ${credits} credits and ${reacted} fresh reactions given today.`,
    }),
  );
  const compliance = await fullComplianceCheck(llmCompliance ?? llm, body);
  const postDraftId = await hub.submitDraft(
    kindVariant("ambassador_crumbeatr"),
    [job.id],
    "Crumbeatr post — Captain Capsaicin",
    body,
    ["crumbeatr"],
    compliance.passed,
    compliance.notes,
    JSON.stringify({ action: "post" }),
  );
  draftIds.push(postDraftId);

  await hub.reportRun(
    kindVariant("ambassador_crumbeatr"),
    `Reacted to ${reacted} posts; drafts ${draftIds.join(", ")} awaiting approval`,
  );
  return draftIds;
}

async function runSwop(ctx) {
  const { hub, llm, llmCompliance, secrets, job, captainIdentity } = ctx;
  if (!captainIdentity) throw new Error("captain identity missing from ctx");

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

  if (!llm) {
    await hub.reportRun(
      kindVariant("ambassador_swop"),
      `Engaged (${liked} likes); no LLM configured, skipping drafts`,
    );
    return null;
  }

  const draftIds = [];

  if (candidates.length > 0) {
    await hub.recordLlmCall(job.agentId);
    const authors = candidates.map((p) => ({
      id: p.id,
      author: p.author.toText().slice(0, 12),
      body: p.content,
    }));
    const raw = await llm.complete(
      engagementPrompt({ platform: "The Swop", posts: authors }),
    );
    const pick = parseJsonLoose(raw);
    if (
      pick &&
      Number.isInteger(pick.index) &&
      pick.index >= 0 &&
      pick.index < candidates.length &&
      pick.comment
    ) {
      const target = candidates[pick.index];
      const compliance = await fullComplianceCheck(
        llmCompliance ?? llm,
        pick.comment,
      );
      const id = await hub.submitDraft(
        kindVariant("ambassador_swop"),
        [job.id],
        `Comment on SWOP ${target.id}`,
        pick.comment,
        ["swop"],
        compliance.passed,
        compliance.notes,
        JSON.stringify({ action: "comment", postId: target.id }),
      );
      draftIds.push(id);
    }
  }

  await hub.recordLlmCall(job.agentId);
  const body = await llm.complete(
    postPrompt({
      platform: "The Swop",
      pillarHint: pillarForToday(),
      contextNote: `Captain liked ${liked} posts this run. Station: ic-spicy (add agent as contributor when ready).`,
    }),
  );
  const compliance = await fullComplianceCheck(llmCompliance ?? llm, body);
  const postDraftId = await hub.submitDraft(
    kindVariant("ambassador_swop"),
    [job.id],
    "SWOP post — Captain Capsaicin",
    body,
    ["swop"],
    compliance.passed,
    compliance.notes,
    JSON.stringify({ action: "post" }),
  );
  draftIds.push(postDraftId);

  await hub.reportRun(
    kindVariant("ambassador_swop"),
    `Liked ${liked} posts; drafts ${draftIds.join(", ")} awaiting approval`,
  );
  return draftIds;
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
        const postId = await crumbClient.addPost(draft.body, { parent });
        await hub.markDraftSent(draft.id);
        console.log(
          `[ambassador] published draft ${draft.id} → crumbeatr post ${postId}`,
        );
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
          const post = await swopClient.createPost(draft.body);
          await hub.markDraftSent(draft.id);
          console.log(
            `[ambassador] published draft ${draft.id} → swop ${post.id}`,
          );
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
