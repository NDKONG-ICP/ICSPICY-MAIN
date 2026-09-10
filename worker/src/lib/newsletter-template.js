export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Placeholder substituted per recipient at send time. */
export const UNSUBSCRIBE_PLACEHOLDER = "{{UNSUBSCRIBE_URL}}";

const ACCENT = "#ee502b";
const GOLD = "#e6b258";
const MUTED = "#c4a894";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionTitle(text) {
  return `<h2 style="font-size:16px;color:${GOLD};margin:24px 0 8px;">${escapeHtml(text)}</h2>`;
}

function dayName(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** Compact 7-day forecast table from DailyOutlook rows. */
export function forecastTableHtml(daily) {
  if (!daily?.length) return "";
  const rows = daily
    .slice(0, 7)
    .map((d) => {
      const rain = Number(d.precipInches) >= 0.05 ? `${Number(d.precipInches).toFixed(2)}"` : "—";
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #3d3028;">${escapeHtml(dayName(d.date))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #3d3028;text-align:right;">${Math.round(Number(d.tempHighF))}° / ${Math.round(Number(d.tempLowF))}°</td>
        <td style="padding:6px 8px;border-bottom:1px solid #3d3028;text-align:right;">${rain}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #3d3028;text-align:right;">${Math.round(Number(d.windMphMax))} mph</td>
      </tr>`;
    })
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;color:#f8f0e8;">
    <tr style="color:${MUTED};font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">
      <th style="text-align:left;padding:4px 8px;">Day</th>
      <th style="text-align:right;padding:4px 8px;">Hi / Lo</th>
      <th style="text-align:right;padding:4px 8px;">Rain</th>
      <th style="text-align:right;padding:4px 8px;">Wind</th>
    </tr>
    ${rows}
  </table>`;
}

/** Featured grower spotlight card. */
export function growerSpotlightHtml(grower, siteUrl) {
  if (!grower) return "";
  const statsLine = (grower.stats ?? [])
    .slice(0, 3)
    .map((s) => `${escapeHtml(s.value)} ${escapeHtml(s.statLabel)}`)
    .join(" · ");
  const img = grower.imageUrl
    ? `<img src="${grower.imageUrl}" alt="${escapeHtml(grower.name)}" width="440" style="width:100%;max-width:440px;border-radius:10px;margin:0 0 12px;display:block;" />`
    : "";
  return `${sectionTitle("🏆 Featured Grower")}
  <div style="background:#211812;border:1px solid #3d3028;border-radius:10px;padding:16px;">
    ${img}
    <div style="font-size:17px;font-weight:700;color:${ACCENT};">${escapeHtml(grower.name)}</div>
    <div style="font-size:12px;color:${MUTED};margin:2px 0 8px;">${escapeHtml(grower.owners)}</div>
    <div style="font-size:13px;font-style:italic;color:${GOLD};margin-bottom:8px;">"${escapeHtml(grower.tagline)}"</div>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.6;">${escapeHtml(grower.blurb)}</p>
    ${statsLine ? `<div style="font-size:12px;color:${MUTED};margin-bottom:10px;">${statsLine}</div>` : ""}
    <a href="${siteUrl}/growers" style="color:${ACCENT};font-size:13px;">Meet our verified growers →</a>
  </div>`;
}

/** Recipe teaser — summary + link, not the full recipe. */
export function recipeCardHtml(recipe, siteUrl) {
  if (!recipe) return "";
  const meta = [
    `${recipe.ingredientCount} ingredients`,
    `${recipe.stepCount} steps`,
  ].join(" · ");
  return `${sectionTitle("🌶️ From the CookBook")}
  <div style="background:#211812;border:1px solid #3d3028;border-radius:10px;padding:16px;">
    <div style="font-size:16px;font-weight:700;margin-bottom:6px;">${escapeHtml(recipe.title)}</div>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">${escapeHtml(recipe.summary)}</p>
    <div style="font-size:12px;color:${MUTED};margin-bottom:10px;">${meta}</div>
    <a href="${siteUrl}/cookbook/${encodeURIComponent(recipe.slug)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:8px;">Get the full recipe →</a>
  </div>`;
}

export function renderNewsletterHtml({
  subject,
  intro,
  growerHtml,
  recipeHtml,
  forecastHtml,
  guidance,
  productsHtml,
  siteUrl,
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#0c0806;font-family:system-ui,-apple-system,sans-serif;color:#f8f0e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
    <tr><td style="padding:32px 20px 16px;text-align:center;">
      <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;">IC <span style="color:${ACCENT};">SPICY</span></div>
      <div style="font-size:12px;color:${MUTED};margin-top:4px;">Rare. Hot. Alive.</div>
    </td></tr>
    <tr><td style="padding:0 20px 24px;">
      <div style="background:#2a201a;border:1px solid #3d3028;border-radius:12px;padding:20px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:${ACCENT};">${escapeHtml(subject)}</h1>
        <p style="margin:0 0 4px;line-height:1.6;font-size:15px;">${escapeHtml(intro)}</p>
        ${growerHtml ?? ""}
        ${recipeHtml ?? ""}
        ${forecastHtml ? `${sectionTitle("☀️ 7-Day Grower Forecast — Zone 10a")}${forecastHtml}` : ""}
        ${guidance ? `${sectionTitle("🌱 This Week in the Garden")}<p style="margin:0;font-size:14px;line-height:1.6;">${escapeHtml(guidance)}</p>` : ""}
        ${productsHtml ? `${sectionTitle("This week at the nursery")}${productsHtml}` : ""}
        <p style="margin:24px 0 0;font-size:13px;"><a href="${siteUrl}/cookbook" style="color:${ACCENT};">Browse the full CookBook →</a> &nbsp;·&nbsp; <a href="${siteUrl}/growers" style="color:${ACCENT};">Verified Growers →</a></p>
      </div>
    </td></tr>
    <tr><td style="padding:0 20px 32px;text-align:center;font-size:11px;color:#8a7a6a;">
      Port Charlotte, FL · FDACS Registered Nursery<br>
      <a href="${siteUrl}" style="color:${MUTED};">icspicy.app</a> &nbsp;·&nbsp;
      <a href="${UNSUBSCRIBE_PLACEHOLDER}" style="color:#8a7a6a;">Unsubscribe</a>
    </td></tr>
  </table>
</body></html>`;
}

/** Branded double-opt-in confirmation email. */
export function confirmEmailHtml(confirmUrl, siteUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirm your IC SPICY subscription</title></head>
<body style="margin:0;background:#0c0806;font-family:system-ui,-apple-system,sans-serif;color:#f8f0e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
    <tr><td style="padding:32px 20px 16px;text-align:center;">
      <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;">IC <span style="color:${ACCENT};">SPICY</span></div>
      <div style="font-size:12px;color:${MUTED};margin-top:4px;">Rare. Hot. Alive.</div>
    </td></tr>
    <tr><td style="padding:0 20px 24px;">
      <div style="background:#2a201a;border:1px solid #3d3028;border-radius:12px;padding:24px;text-align:center;">
        <h1 style="margin:0 0 12px;font-size:20px;color:${ACCENT};">One click to confirm</h1>
        <p style="margin:0 0 20px;line-height:1.6;font-size:15px;">You (or someone very spicy) asked for the weekly IC SPICY grower newsletter — featured growers, CookBook recipes, and a 7-day Zone 10a forecast with planting guidance.</p>
        <a href="${confirmUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 28px;border-radius:8px;">Confirm subscription</a>
        <p style="margin:20px 0 0;font-size:12px;color:${MUTED};">Didn't sign up? Ignore this email and you'll never hear from us.</p>
      </div>
    </td></tr>
    <tr><td style="padding:0 20px 32px;text-align:center;font-size:11px;color:#8a7a6a;">
      Port Charlotte, FL · FDACS Registered Nursery<br>
      <a href="${siteUrl}" style="color:${MUTED};">icspicy.app</a>
    </td></tr>
  </table>
</body></html>`;
}

export function productsListHtml(products) {
  const active = products
    .filter((p) => p.active && (p.inventory_remaining?.[0] ?? 1n) > 0n)
    .slice(0, 5);
  if (!active.length) return "";
  return `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;">${active
    .map((p) => `<li>${escapeHtml(p.name)} — $${(Number(p.price_cents) / 100).toFixed(2)}</li>`)
    .join("")}</ul>`;
}
