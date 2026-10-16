/**
 * Auto-reply to comments on Captain's posts (Community, Crumbeatr, SWOP).
 */

import { fullComplianceCheck, runComplianceRules } from "./compliance.js";
import { replyCommentPrompt } from "./persona.js";
import { createCommunityClient } from "../clients/community.js";
import { createCrumbeatrClient } from "../clients/crumbeatr.js";
import { createSwopClient, SWOP_CORE, SWOP_SOCIAL } from "../clients/swop.js";

const MAX_REPLIES_PER_MINUTE = 3;

let replyBudget = { windowMs: 0, remaining: MAX_REPLIES_PER_MINUTE };

function consumeReplySlot() {
  const now = Date.now();
  if (now - replyBudget.windowMs > 60_000) {
    replyBudget = { windowMs: now, remaining: MAX_REPLIES_PER_MINUTE };
  }
  if (replyBudget.remaining <= 0) return false;
  replyBudget.remaining -= 1;
  return true;
}

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

async function publishReply(ctx, platform, replyText, publishFn) {
  const { llmCompliance, llm, hub, job } = ctx;
  const rules = runComplianceRules(replyText);
  if (!rules.passed) {
    console.warn(`[captain-replies] ${platform} compliance block: ${rules.notes}`);
    return null;
  }
  if (llmCompliance || llm) {
    const compliance = await fullComplianceCheck(llmCompliance ?? llm, replyText);
    if (!compliance.passed) {
      console.warn(`[captain-replies] ${platform} LLM compliance block`);
      return null;
    }
  }
  const id = await publishFn(replyText.trim());
  return id;
}

export async function runCaptainCommentReplies(ctx) {
  const { secrets, captainIdentity, llm, hub } = ctx;
  if (!captainIdentity || !llm) return { replied: 0, notes: [] };

  const meText = captainIdentity.getPrincipal().toText();
  const notes = [];
  let replied = 0;

  // ── Community Garden ──────────────────────────────────────────────────────
  try {
    const community = await createCommunityClient({ identity: captainIdentity });
    const myPosts = await community.myPosts(8);
    for (const post of myPosts) {
      if (!consumeReplySlot()) break;
      const comments = await community.listCommentsByPost(post.id);
      const others = comments.filter(
        (c) => c.author.toText() !== meText && !c.is_anonymous,
      );
      if (others.length === 0) continue;
      const captainReplied = comments.some((c) => c.author.toText() === meText);
      if (captainReplied) continue;
      const target = others.sort((a, b) => Number(b.created_at - a.created_at))[0];
      if (ctx.job?.agentId) await hub.recordLlmCall(ctx.job.agentId);
      const raw = await llm.complete(
        replyCommentPrompt({
          platform: "IC SPICY Community Garden",
          postBody: post.content,
          commentBody: target.content,
          author: target.author_username?.[0] || target.author_text,
        }),
      );
      const text = String(raw).trim();
      if (text.length < 8) continue;
      const cid = await publishReply(ctx, "community", text, (body) =>
        community.createComment(post.id, body).then((c) => c.id),
      );
      if (cid != null) {
        replied += 1;
        notes.push(`community reply on #${post.id} → comment ${cid}`);
      }
    }
  } catch (err) {
    notes.push(
      `community replies err: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Crumbeatr ─────────────────────────────────────────────────────────────
  try {
    const crumb = await createCrumbeatrClient({
      identity: captainIdentity,
      canisterId: secrets.crumbeatr_canister_id || undefined,
    });
    const profile = await crumb.myProfile();
    if (profile) {
      const myId = profile.id;
      const feed = (await crumb.lastPosts(0, 0)) ?? [];
      const mine = feed.filter((p) => p.user === myId).slice(0, 6);
      for (const post of mine) {
        if (!consumeReplySlot()) break;
        const thread = (await crumb.thread(post.id)) ?? [];
        const replies = thread.filter((p) => p.user !== myId && p.parent === post.id);
        if (replies.length === 0) continue;
        const already = thread.some(
          (p) => p.user === myId && p.parent === post.id,
        );
        if (already) continue;
        const target = replies[0];
        if (ctx.job?.agentId) await hub.recordLlmCall(ctx.job.agentId);
        const raw = await llm.complete(
          replyCommentPrompt({
            platform: "Crumbeatr",
            postBody: post.body,
            commentBody: target.body,
            author: target.meta?.author_name ?? String(target.user),
          }),
        );
        const text = String(raw).trim();
        if (text.length < 8) continue;
        const pid = await publishReply(ctx, "crumbeatr", text, (body) =>
          crumb.addPost(body, { parent: Number(post.id) }),
        );
        if (pid != null) {
          replied += 1;
          notes.push(`crumbeatr reply on #${post.id} → ${pid}`);
        }
      }
    }
  } catch (err) {
    notes.push(
      `crumbeatr replies err: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── SWOP ──────────────────────────────────────────────────────────────────
  try {
    const swop = await createSwopClient({
      identity: captainIdentity,
      coreId: secrets.swop_backend_canister_id || SWOP_CORE,
      socialId: secrets.swop_social_canister_id || SWOP_SOCIAL,
    });
    const mine = await swop.publicFeed(40n);
    const captainPosts = (mine || []).filter(
      (p) => !p.deleted && p.author?.toText?.() === meText,
    );
    for (const post of captainPosts.slice(0, 6)) {
      if (!consumeReplySlot()) break;
      const comments = await swop.getCommentsForPost(post.id);
      const others = (comments || []).filter(
        (c) => !c.deleted && c.author?.toText?.() !== meText,
      );
      if (others.length === 0) continue;
      const already = (comments || []).some(
        (c) => !c.deleted && c.author?.toText?.() === meText,
      );
      if (already) continue;
      const target = others[0];
      if (ctx.job?.agentId) await hub.recordLlmCall(ctx.job.agentId);
      const raw = await llm.complete(
        replyCommentPrompt({
          platform: "The Swop",
          postBody: post.content,
          commentBody: target.content,
          author: target.author?.toText?.()?.slice(0, 12) ?? "member",
        }),
      );
      const text = String(raw).trim();
      if (text.length < 8) continue;
      const cid = await publishReply(ctx, "swop", text, (body) =>
        swop.addComment(post.id, body).then((c) => c.id),
      );
      if (cid != null) {
        replied += 1;
        notes.push(`swop reply on ${post.id} → ${cid}`);
      }
    }
  } catch (err) {
    notes.push(
      `swop replies err: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { replied, notes };
}
