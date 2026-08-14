export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function renderNewsletterHtml({
  subject,
  intro,
  recipeTitle,
  recipeBody,
  productsHtml,
  weatherNote,
  siteUrl,
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#0c0806;font-family:system-ui,-apple-system,sans-serif;color:#f8f0e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
    <tr><td style="padding:32px 20px 16px;text-align:center;">
      <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;">IC <span style="color:#ee502b;">SPICY</span></div>
      <div style="font-size:12px;color:#c4a894;margin-top:4px;">Rare. Hot. Alive.</div>
    </td></tr>
    <tr><td style="padding:0 20px 24px;">
      <div style="background:#2a201a;border:1px solid #3d3028;border-radius:12px;padding:20px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:#ee502b;">${escapeHtml(subject)}</h1>
        <p style="margin:0 0 16px;line-height:1.6;font-size:15px;">${escapeHtml(intro)}</p>
        <h2 style="font-size:16px;color:#e6b258;margin:20px 0 8px;">CookBook — ${escapeHtml(recipeTitle)}</h2>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(recipeBody)}</div>
        ${weatherNote ? `<h2 style="font-size:16px;color:#e6b258;margin:20px 0 8px;">Weather Desk</h2><p style="font-size:14px;line-height:1.6;">${escapeHtml(weatherNote)}</p>` : ""}
        ${productsHtml ? `<h2 style="font-size:16px;color:#e6b258;margin:20px 0 8px;">This week at the nursery</h2>${productsHtml}` : ""}
        <p style="margin:24px 0 0;font-size:13px;"><a href="${siteUrl}/cookbook" style="color:#ee502b;">Browse the full CookBook →</a></p>
      </div>
    </td></tr>
    <tr><td style="padding:0 20px 32px;text-align:center;font-size:11px;color:#8a7a6a;">
      Port Charlotte, FL · FDACS Registered Nursery<br>
      <a href="${siteUrl}" style="color:#c4a894;">icspicy.com</a>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function productsListHtml(products) {
  const active = products.filter((p) => p.active && p.inventory > 0n).slice(0, 5);
  if (!active.length) return "";
  return `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;">${active
    .map((p) => `<li>${escapeHtml(p.name)} — $${(Number(p.price_cents) / 100).toFixed(2)}</li>`)
    .join("")}</ul>`;
}
