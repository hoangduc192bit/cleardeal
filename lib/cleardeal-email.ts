export interface ClearDealEmail {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export const isClearDealEmailConfigured = Boolean(
  process.env.RESEND_API_KEY?.trim() &&
    process.env.CLEARDEAL_EMAIL_FROM?.trim(),
);

export async function sendClearDealEmail(email: ClearDealEmail) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CLEARDEAL_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { sent: false as const, reason: "not_configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(email.to) ? email.to : [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`email_provider_failed:${response.status}`);
  }
  const body = (await response.json()) as { id?: string };
  return { sent: true as const, id: body.id };
}
