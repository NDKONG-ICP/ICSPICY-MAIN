import { fullComplianceCheck } from "../lib/compliance.js";
import { kindVariant } from "../idl/agent-hub.js";

const VOICES = {
  social_x: "X/Twitter: build-in-public, ICP credibility, short threads, provenance demos. Max 280 chars per post idea.",
  social_instagram: "Instagram: pepper macros, plant tags, Reels hooks, visual storytelling.",
  social_tiktok: "TikTok: fast hooks, grow updates, heat reactions, 15-30 sec script.",
  social_facebook: "Facebook: local Florida trust, nursery updates, community warmth.",
  social_youtube: "YouTube: proof archive, longer narrative, chapter titles, SEO-friendly description.",
};

export async function runSocialAgent(ctx, platformKey) {
  const { hub, backend, llm, job } = ctx;
  const voice = VOICES[platformKey] ?? "Social media post";

  const [recipes, weather] = await Promise.all([
    backend.getFeaturedRecipes(1n),
    backend.getWeatherBrief([], []),
  ]);
  const recipe = recipes[0]?.title ?? "Natural Farming";
  const weatherNote = weather?.[0]?.text?.slice(0, 120) ?? "Zone 10a Florida";

  let body = `🌶️ ${recipe} — ${weatherNote}\n\nScan-to-provenance at IC SPICY. Rare. Hot. Alive.`;
  if (llm) {
    await hub.recordLlmCall(job.agentId);
    body = await llm.complete(
      `IC SPICY ${voice}\nDraft one engaging post about ${recipe}. Weather context: ${weatherNote}. Include a CTA to visit the CookBook or scan a plant tag. No token/investment claims.`,
    );
  }

  const compliance = await fullComplianceCheck(llm, body);
  const title = `${platformKey} daily draft`;
  const draftId = await hub.submitDraft(
    kindVariant(platformKey),
    [job.id],
    title,
    body,
    [platformKey.replace("social_", "")],
    compliance.passed,
    compliance.notes,
    JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
  );

  await hub.reportRun(kindVariant(platformKey), `Draft ${draftId}`);
  return draftId;
}

export async function runEmailCorrespondenceAgent(ctx) {
  const { hub, llm, job } = ctx;
  const body = llm
    ? await llm.complete(
        "Draft a friendly IC SPICY email template for replying to a customer asking about plant care in Zone 10a. 3 short paragraphs. No health/investment claims.",
      )
    : "Thank you for reaching out to IC SPICY! We'd love to help with your pepper plants in Zone 10a.";

  const compliance = await fullComplianceCheck(llm, body);
  const draftId = await hub.submitDraft(
    kindVariant("email_correspondence"),
    [job.id],
    "Customer reply template",
    body,
    ["email"],
    compliance.passed,
    compliance.notes,
    "{}",
  );
  await hub.reportRun(kindVariant("email_correspondence"), `Template draft ${draftId}`);
  return draftId;
}
