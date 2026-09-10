import { fullComplianceCheck } from "../lib/compliance.js";
import {
  UNSUBSCRIBE_PLACEHOLDER,
  forecastTableHtml,
  growerSpotlightHtml,
  isoWeekKey,
  productsListHtml,
  recipeCardHtml,
  renderNewsletterHtml,
} from "../lib/newsletter-template.js";
import { sendEmail } from "../clients/resend.js";
import { kindVariant } from "../idl/agent-hub.js";

const BRAND_VOICE = `IC SPICY brand voice: farm-grown heat, chef-built flavor, blockchain-backed provenance. Rare Florida peppers, KNF/JADAM natural farming, Zone 10a. Never promise investment returns or unverified organic/health claims.`;

const UPLOADS_CANISTER_ID =
  process.env.UPLOADS_CANISTER_ID?.trim() || "r53pg-maaaa-aaaao-ba7na-cai";

function uploadsUrl(key) {
  if (!key) return "";
  const normalized = key.startsWith("/") ? key.slice(1) : key;
  return `https://${UPLOADS_CANISTER_ID}.raw.icp0.io/${normalized}`;
}

/** Prefer the grower flagged for the current month, then any flagged, then lowest sortOrder. */
function pickFeaturedGrower(growers) {
  if (!growers?.length) return null;
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
  const flagged = growers.filter((g) => (g.growerOfTheMonth?.[0] ?? "") !== "");
  const currentMonth = flagged.find((g) => g.growerOfTheMonth[0] === monthKey);
  if (currentMonth) return currentMonth;
  if (flagged.length) return flagged[0];
  return [...growers].sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))[0];
}

function forecastPromptLines(daily) {
  return daily
    .slice(0, 7)
    .map(
      (d) =>
        `${d.date}: high ${Math.round(Number(d.tempHighF))}F low ${Math.round(Number(d.tempLowF))}F rain ${Number(d.precipInches).toFixed(2)}in wind ${Math.round(Number(d.windMphMax))}mph UV ${Math.round(Number(d.uvIndexMax))}`,
    )
    .join("\n");
}

function parseJsonLoose(raw) {
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

export async function runNewsletterAgent(ctx) {
  const { hub, backend, llm, llmCompliance, job } = ctx;
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://icspicy.app";
  const weekKey = isoWeekKey();

  const [recipes, products, growers, outlookOpt] = await Promise.all([
    backend.getFeaturedRecipes(3n),
    backend.listProducts(),
    backend.listVerifiedGrowers().catch(() => []),
    backend.getNurseryWeatherDesk().catch(() => []),
  ]);

  const recipe = recipes[0];
  if (!recipe) throw new Error("No featured recipe found");
  const grower = pickFeaturedGrower(growers);
  const daily = outlookOpt?.[0]?.daily?.slice(0, 7) ?? [];

  // Deterministic fallbacks (used verbatim when no LLM key is configured).
  let intro = `This week's Natural Farming note from Port Charlotte — ${recipe.title} from the IC SPICY CookBook.`;
  let growerBlurb = grower ? grower.story.slice(0, 280) : "";
  let recipeSummary = recipe.description.slice(0, 280);
  let guidance = "";

  if (llm && (await hub.recordLlmCall(job.agentId))) {
    const prompt = `${BRAND_VOICE}

Write the weekly IC SPICY newsletter copy for week ${weekKey}. Reply with STRICT JSON only, no markdown fences:
{"intro":"...","growerBlurb":"...","recipeSummary":"...","gardenGuidance":"..."}

- intro: 2-3 sentences. A warm seasonal hook that makes a busy grower open this email. Mention the featured grower and recipe by name.
- growerBlurb: 2-3 sentences celebrating our featured verified grower${grower ? ` ${grower.name} ("${grower.tagline}") — source story: ${grower.story.slice(0, 600)}` : " (none this week — return empty string)"}. Warm, specific, no hype.
- recipeSummary: max 3 sentences teasing the recipe "${recipe.title}": ${recipe.description.slice(0, 400)}. Make readers click through; do not list the steps.
- gardenGuidance: 3-5 sentences of concrete Zone 10a (SWFL) pepper-growing guidance derived STRICTLY from this 7-day forecast (watering, transplanting, shade, wind protection). No invented weather.
${daily.length ? forecastPromptLines(daily) : "(no forecast available — return empty string for gardenGuidance)"}

No health claims, no investment/token claims.`;
    try {
      const parsed = parseJsonLoose(await llm.complete(prompt));
      if (parsed) {
        if (parsed.intro) intro = String(parsed.intro);
        if (parsed.growerBlurb) growerBlurb = String(parsed.growerBlurb);
        if (parsed.recipeSummary) recipeSummary = String(parsed.recipeSummary);
        if (parsed.gardenGuidance) guidance = String(parsed.gardenGuidance);
      }
    } catch (err) {
      console.error("[newsletter] LLM call failed, using fallback copy:", err.message);
    }
  }

  const subject = `IC SPICY · Week ${weekKey} · ${recipe.title}`;
  const html = renderNewsletterHtml({
    subject,
    intro,
    growerHtml: grower
      ? growerSpotlightHtml(
          {
            name: grower.name,
            owners: grower.owners,
            tagline: grower.tagline,
            blurb: growerBlurb,
            stats: grower.stats,
            imageUrl: uploadsUrl(grower.imageKey),
          },
          siteUrl,
        )
      : "",
    recipeHtml: recipeCardHtml(
      {
        title: recipe.title,
        slug: recipe.slug,
        summary: recipeSummary,
        ingredientCount: recipe.ingredients.length,
        stepCount: recipe.steps.length,
      },
      siteUrl,
    ),
    forecastHtml: forecastTableHtml(daily),
    guidance,
    productsHtml: productsListHtml(products),
    siteUrl,
  });

  const complianceText = [intro, growerBlurb, recipeSummary, guidance].join("\n");
  const compliance = await fullComplianceCheck(llmCompliance ?? llm, complianceText);
  const draftId = await hub.submitDraft(
    kindVariant("newsletter"),
    [job.id],
    subject,
    html,
    ["email"],
    compliance.passed,
    compliance.notes,
    JSON.stringify({ weekKey, recipeSlug: recipe.slug, grower: grower?.name ?? null }),
  );

  await hub.reportRun(kindVariant("newsletter"), `Draft ${draftId} for ${weekKey}`);
  return { draftId, weekKey, subject, html };
}

export async function sendApprovedNewsletters(ctx) {
  const { hub, secrets } = ctx;
  const apiKey = secrets.resend_api_key;
  const from = secrets.resend_from_email;
  if (!apiKey || !from) return;
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://icspicy.app";

  const approved = await hub.getApprovedDraftsForSend(5n);
  for (const draft of approved) {
    if (Object.keys(draft.agentKind)[0] !== "newsletter") continue;
    const meta = JSON.parse(draft.metadata || "{}");
    const weekKey = meta.weekKey ?? isoWeekKey();
    const recipients = await hub.listConfirmedSubscribersForSend(5000n);
    if (!recipients.length) continue;

    for (const [email, unsubToken] of recipients) {
      const unsubUrl = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
      const personalized = draft.body.split(UNSUBSCRIBE_PLACEHOLDER).join(unsubUrl);
      await sendEmail({
        apiKey,
        from,
        to: [email],
        subject: draft.title,
        html: personalized,
        idempotencyKey: `newsletter-${weekKey}-${email}`,
      });
    }

    await hub.markDraftSent(draft.id);
    await hub.archiveNewsletterIssue(
      weekKey,
      draft.title,
      draft.body,
      draft.id,
      BigInt(recipients.length),
    );
  }
}
