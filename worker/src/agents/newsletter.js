import { fullComplianceCheck } from "../lib/compliance.js";
import { isoWeekKey, productsListHtml, renderNewsletterHtml } from "../lib/newsletter-template.js";
import { sendBatchNewsletter } from "../clients/resend.js";
import { kindVariant } from "../idl/agent-hub.js";

const BRAND_VOICE = `IC SPICY brand voice: farm-grown heat, chef-built flavor, blockchain-backed provenance. Rare Florida peppers, KNF/JADAM natural farming, Zone 10a. Never promise investment returns or unverified organic/health claims.`;

export async function runNewsletterAgent(ctx) {
  const { hub, backend, llm, secrets, job } = ctx;
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://icspicy.com";
  const weekKey = isoWeekKey();

  const [recipes, products, weather] = await Promise.all([
    backend.getFeaturedRecipes(3n),
    backend.listProducts(),
    backend.getWeatherBrief([null], [null]),
  ]);

  const recipe = recipes[0];
  if (!recipe) throw new Error("No featured recipe found");

  const ingredientLines = recipe.ingredients.map(
    (i) => `${i.amount} ${i.name}${i.is_optional ? " (optional)" : ""}`,
  );
  const stepLines = recipe.steps.map(
    (s) => `${Number(s.step_number)}. ${s.instruction}`,
  );
  const recipeText = `${recipe.title}\n\n${recipe.description}\n\nIngredients:\n${ingredientLines.join("\n")}\n\nSteps:\n${stepLines.join("\n")}`;
  const weatherNote = weather?.[0]?.text ?? "";

  let intro = `This week's Natural Farming note from Port Charlotte — ${recipe.title} from the IC SPICY CookBook.`;
  if (llm) {
    await hub.recordLlmCall(job.agentId);
    intro = await llm.complete(
      `${BRAND_VOICE}\nWrite a 2-sentence newsletter intro for week ${weekKey}. Recipe: ${recipe.title}. Weather: ${weatherNote.slice(0, 200)}`,
    );
  }

  const subject = `IC SPICY · Week ${weekKey} · ${recipe.title}`;
  const html = renderNewsletterHtml({
    subject,
    intro,
    recipeTitle: recipe.title,
    recipeBody: recipeText,
    productsHtml: productsListHtml(products),
    weatherNote,
    siteUrl,
  });

  const compliance = await fullComplianceCheck(llm, `${intro}\n${recipeText}`);
  const draftId = await hub.submitDraft(
    kindVariant("newsletter"),
    [job.id],
    subject,
    html,
    ["email"],
    compliance.passed,
    compliance.notes,
    JSON.stringify({ weekKey, recipeSlug: recipe.slug }),
  );

  await hub.reportRun(kindVariant("newsletter"), `Draft ${draftId} for ${weekKey}`);
  return { draftId, weekKey, subject, html };
}

export async function sendApprovedNewsletters(ctx) {
  const { hub, secrets } = ctx;
  const apiKey = secrets.resend_api_key;
  const from = secrets.resend_from_email;
  if (!apiKey || !from) return;

  const approved = await hub.getApprovedDraftsForSend(5n);
  for (const draft of approved) {
    if (Object.keys(draft.agentKind)[0] !== "newsletter") continue;
    const meta = JSON.parse(draft.metadata || "{}");
    const weekKey = meta.weekKey ?? isoWeekKey();
    const recipients = await hub.listConfirmedSubscriberEmails(5000n);
    if (!recipients.length) continue;

    await sendBatchNewsletter({
      apiKey,
      from,
      recipients,
      subject: draft.title,
      html: draft.body,
      weekKey,
    });

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
