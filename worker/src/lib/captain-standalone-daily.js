/**
 * Shared Captain daily standalone publish (Community + Crumbeatr + SWOP + X teaser).
 */

import { kindVariant } from "../idl/agent-hub.js";
import { pillarForSlot, postPrompt } from "./persona.js";
import { publishCaptainStandalonePost } from "./captain-publish.js";
import {
  markEtScheduleTriggerFired,
  markStandalonePostedTodayET,
  nextStandaloneSlotIndexET,
  SLOT_LABELS,
  standaloneSlotsRemainingTodayET,
  STANDALONE_SLOTS_PER_DAY,
} from "./captain-daily.js";
import {
  getRecentTopics,
  isDuplicatePostBody,
  recordPublishedPost,
} from "./captain-post-history.js";

/**
 * @param {object} ctx — hub, llm, secrets, captainIdentity, job?, agentId?
 * @param {{ slotLabel?: string, contextPrefix?: string, reportKind?: string }} [opts]
 */
export async function attemptCaptainStandaloneDailyPost(ctx, opts = {}) {
  const { hub, llm } = ctx;
  const reportKind = opts.reportKind ?? "ambassador_crumbeatr";

  if (!llm) {
    return { ok: false, reason: "no_llm" };
  }

  const slotsLeft = standaloneSlotsRemainingTodayET();
  if (slotsLeft <= 0) {
    return { ok: false, reason: "all_slots_filled" };
  }

  const slotIndex = nextStandaloneSlotIndexET();
  const slotLabel =
    opts.slotLabel ?? SLOT_LABELS[slotIndex] ?? `slot${slotIndex}`;
  const pillarHint = pillarForSlot(slotIndex);
  const avoidTopics = getRecentTopics(14);
  const prefix = opts.contextPrefix ?? "";

  const agentId = ctx.job?.agentId ?? ctx.agentId;
  if (agentId != null) {
    await hub.recordLlmCall(agentId);
  }

  let body = String(
    await llm.complete(
      postPrompt({
        platform: "IC SPICY Community Garden, Crumbeatr, and The Swop",
        pillarHint,
        avoidTopics,
        contextNote:
          `${prefix}Daily Captain ${slotLabel} post (ET slot ${slotIndex + 1}/${STANDALONE_SLOTS_PER_DAY}).`,
      }),
    ),
  ).trim();

  if (isDuplicatePostBody(body)) {
    if (agentId != null) await hub.recordLlmCall(agentId);
    body = String(
      await llm.complete(
        postPrompt({
          platform: "IC SPICY Community Garden, Crumbeatr, and The Swop",
          pillarHint: `${pillarHint} — use a completely different angle than before`,
          avoidTopics: [...avoidTopics, pillarHint],
          contextNote: "Rewrite required: prior draft was too similar to recent posts.",
        }),
      ),
    ).trim();
  }

  if (isDuplicatePostBody(body)) {
    return { ok: false, reason: "duplicate_body", slotLabel };
  }

  try {
    const pub = await publishCaptainStandalonePost(ctx, body);
    markStandalonePostedTodayET({
      slot: slotIndex,
      label: slotLabel,
      communityPostId: pub.communityPostId,
    });
    if (opts.etTriggerLabel) {
      markEtScheduleTriggerFired(opts.etTriggerLabel);
    }
    recordPublishedPost({ body, topic: pillarHint, slot: slotIndex });

    const summary =
      `daily_${slotLabel}=${pub.notes}` +
      (pub.xTweetUrl ? `; x_tweet=${pub.xTweetUrl}` : "") +
      (pub.media?.pow ? `; ${pub.media.pow}` : "");

    if (!opts.skipHubReport) {
      await hub.reportRun(kindVariant(reportKind), summary);
    }

    return { ok: true, slotLabel, pub, summary };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!opts.skipHubReport) {
      await hub.reportRun(
        kindVariant(reportKind),
        `daily_${slotLabel}_failed=${msg}`,
      );
    }
    return { ok: false, reason: "publish_failed", slotLabel, error: msg };
  }
}
