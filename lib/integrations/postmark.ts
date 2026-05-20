export interface PostmarkMessage {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export async function sendPostmarkEmail(message: PostmarkMessage, env: CloudflareEnv = {}) {
  const token = env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_SERVER_TOKEN;
  const from = env.POSTMARK_FROM_EMAIL || process.env.POSTMARK_FROM_EMAIL;

  if (!token || !from) {
    return {
      ok: false,
      skipped: true,
      reason: "Postmark secrets are not configured.",
    };
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: message.to,
      Subject: message.subject,
      HtmlBody: message.htmlBody,
      TextBody: message.textBody,
      MessageStream: "outbound",
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}
