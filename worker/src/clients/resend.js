export async function sendEmail({ apiKey, from, to, subject, html, idempotencyKey }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  return res.json();
}

export async function sendBatchNewsletter({
  apiKey,
  from,
  recipients,
  subject,
  html,
  weekKey,
}) {
  const results = [];
  for (const email of recipients) {
    await sendEmail({
      apiKey,
      from,
      to: [email],
      subject,
      html,
      idempotencyKey: `newsletter-${weekKey}-${email}`,
    });
    results.push(email);
  }
  return results;
}
