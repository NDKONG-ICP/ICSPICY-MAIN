import { kindVariant } from "../idl/agent-hub.js";
import { fullComplianceCheck } from "../lib/compliance.js";

/** Render decoded TropicalSummaryLite (opt-unwrapped) as prompt-safe text. */
function tropicalToText(summary) {
  if (!summary) return "No tropical data available.";
  const storms = summary.storms.map(
    (s) => `${s.classification} ${s.name} — ${Number(s.maxWindKt)}kt, ${s.movementText}`,
  );
  const activity = storms.length ? storms.join("; ") : "No active storms";
  return `Season active: ${summary.seasonActive}. ${activity}. Source: ${summary.dataSource}.`;
}

export async function runFleetCyclesOps(ctx) {
  const { hub, backend, job } = ctx;
  const report = await backend.getFleetCanisterHealth();
  const balance = await backend.getCycleBalance();
  const lines = report.canisters.map(
    (c) => `${c.label}: ${(Number(c.cycles) / 1e12).toFixed(2)}T cycles, burn ${(Number(c.burnPerDay) / 1e12).toFixed(3)}T/day`,
  );
  const body = `Fleet health digest\nBackend balance: ${(Number(balance) / 1e12).toFixed(2)}T cycles\n\n${lines.join("\n")}\n\nApp burn/day: ${(Number(report.appBurnPerDay) / 1e12).toFixed(3)}T`;

  await hub.submitDraft(
    kindVariant("fleet_cycles_ops"),
    [job.id],
    "Fleet & cycles digest",
    body,
    [],
    true,
    "Internal ops — no public claims",
    JSON.stringify({ internal: true }),
  );
  await hub.reportRun(kindVariant("fleet_cycles_ops"), `${report.canisters.length} canisters checked`);
}

export async function runWeatherConcierge(ctx) {
  const { hub, backend, job, llm } = ctx;
  const [weather, tropical, recipes] = await Promise.all([
    backend.getWeatherBrief([null], [null]),
    backend.getTropicalSummary(),
    backend.getFeaturedRecipes(1n),
  ]);
  const brief = weather?.[0]?.text ?? "";
  const tropText = tropicalToText(tropical?.[0]);
  const recipe = recipes?.[0];
  const dateKey = new Date().toISOString().slice(0, 10);

  const system = `You are the IC SPICY Weather Concierge — a warm, authoritative Florida grower almanac voice.
Write a daily weather almanac for pepper growers in Zone 10a (SWFL).
Structure: morning greeting, today's conditions, 3-day outlook, tropical note if relevant, one grower action, one cookbook tie-in, moon/garden lore if data allows.
Never invent storms not in the brief. Max 900 words. Branded IC SPICY.`;

  let body = brief;
  if (llm) {
    await hub.recordLlmCall(job.agentId);
    body = await llm.complete(
      `${system}\n\nON-CHAIN BRIEF:\n${brief}\n\nTROPICAL:\n${tropText}\n\nFEATURED RECIPE: ${recipe?.title ?? "seasonal pepper dish"}`,
    );
  }

  const title = `Daily Almanac · ${dateKey} · SWFL Grower Desk`;
  const recipeSlug = recipe?.slug ?? null;

  // Compliance gate: never auto-publish content that fails review.
  // Failures go to the draft queue for human sign-off instead.
  const compliance = await fullComplianceCheck(llm, `${title}\n${body}`);
  if (!compliance.passed) {
    await hub.submitDraft(
      kindVariant("weather_concierge"),
      [job.id],
      title,
      body,
      [],
      false,
      compliance.notes,
      JSON.stringify({ dateKey, blockedAutoPublish: true }),
    );
    await hub.reportRun(
      kindVariant("weather_concierge"),
      `Almanac ${dateKey} held for review: ${compliance.notes}`,
    );
    return;
  }

  await backend.publishDailyAlmanac(
    dateKey,
    title,
    body.slice(0, 12000),
    recipeSlug ? [recipeSlug] : [],
    [],
  );

  await hub.reportRun(
    kindVariant("weather_concierge"),
    `Almanac published for ${dateKey}`,
  );
}

export async function runWeatherSentinel(ctx) {
  const { hub, backend, job, llm } = ctx;
  const tropical = await backend.getTropicalSummary();
  const weather = await backend.getWeatherBrief([null], [null]);
  const text = weather?.[0]?.text ?? "";
  const summary = tropical?.[0];
  const tropText = tropicalToText(summary);
  let suggestion = `Tropical: ${tropText}\n\n${text}`;
  if (llm && (summary?.storms?.length ?? 0) > 0) {
    await hub.recordLlmCall(job.agentId);
    suggestion = await llm.complete(
      `IC SPICY weather sentinel. Tropical summary: ${tropText}. Nursery brief: ${text}. Draft storm-prep social post suggestion for pepper growers in Zone 10a. No fear-mongering.`,
    );
  }
  await hub.submitDraft(
    kindVariant("weather_sentinel"),
    [job.id],
    "Weather sentinel alert",
    suggestion,
    [],
    true,
    "Weather ops",
    JSON.stringify({ tropical: tropText.slice(0, 200) }),
  );
  await hub.reportRun(kindVariant("weather_sentinel"), "Weather check complete");
}

export async function runNimsOps(ctx) {
  const { hub, job } = ctx;
  const body =
    "NIMS daily digest placeholder — connect tray/germination APIs in a future phase. Check Admin → NIMS for trays due to transplant, watering schedules, and dead-plant flags.";
  await hub.submitDraft(
    kindVariant("nims_ops"),
    [job.id],
    "NIMS ops digest",
    body,
    [],
    true,
    "Internal",
    JSON.stringify({ internal: true }),
  );
  await hub.reportRun(kindVariant("nims_ops"), "Digest queued");
}

export async function runOrdersClaimsOps(ctx) {
  const { hub, backend, job } = ctx;
  const [newOrders, claims] = await Promise.all([
    backend.getNewOrderCount(),
    backend.adminListClaimRequests([{ pending: null }]),
  ]);
  const body = `Orders & claims ops\nNew orders since last seen: ${newOrders}\nPending plant claim requests: ${claims.length}\n\nReview in Admin → Orders and Admin → NIMS → Claim Queue.`;
  await hub.submitDraft(
    kindVariant("orders_claims_ops"),
    [job.id],
    "Orders & claims nudge",
    body,
    [],
    true,
    "Internal ops",
    JSON.stringify({ newOrders: Number(newOrders), pendingClaims: claims.length }),
  );
  await hub.reportRun(kindVariant("orders_claims_ops"), `${claims.length} pending claims`);
}

export async function runCommunityModerator(ctx) {
  const { hub, backend, job } = ctx;
  const posts = await backend.listAllPostsAdmin(0n, 20n);
  const flagged = posts.filter((p) =>
    /\b(scam|spam|http:\/\/|token moon|buy now)\b/i.test(p.content),
  );
  const body =
    flagged.length === 0
      ? "Community scan: no posts flagged for review in the last 20 admin posts."
      : `Community moderator flagged ${flagged.length} post(s):\n${flagged.map((p) => `#${p.id}: ${p.content.slice(0, 120)}`).join("\n")}`;

  await hub.submitDraft(
    kindVariant("community_moderator"),
    [job.id],
    "Community moderation scan",
    body,
    [],
    true,
    "Moderation",
    JSON.stringify({ flagged: flagged.length }),
  );
  await hub.reportRun(kindVariant("community_moderator"), `${flagged.length} flagged`);
}

export async function runAnalyticsDigest(ctx) {
  const { hub, backend, job, llm } = ctx;
  const stats = await backend.getUsageRollups(7n);
  const totals = {};
  for (const row of stats) {
    totals[row.feature] = (totals[row.feature] ?? 0) + Number(row.count);
  }
  let body = `Weekly analytics (7d)\n${Object.entries(totals)
    .map(([k, v]) => `${k}: ${v} events`)
    .join("\n")}`;
  if (llm) {
    await hub.recordLlmCall(job.agentId);
    body = await llm.complete(
      `Summarize this IC SPICY app usage for the founder in 5 bullet points:\n${body}`,
    );
  }
  await hub.submitDraft(
    kindVariant("analytics_digest"),
    [job.id],
    "Weekly analytics digest",
    body,
    [],
    true,
    "Internal analytics",
    JSON.stringify(totals),
  );
  await hub.reportRun(kindVariant("analytics_digest"), "Digest complete");
}

export async function runComplianceReviewer(ctx) {
  const { hub, job } = ctx;
  await hub.reportRun(kindVariant("compliance_reviewer"), "Compliance runs inline on each draft");
}
