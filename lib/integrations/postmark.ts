export interface PostmarkMessage {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
  }>;
}

export async function sendPostmarkEmail(message: PostmarkMessage, env: CloudflareEnv = {}) {
  const cloudflareFrom = env.CLOUDFLARE_EMAIL_FROM || process.env.CLOUDFLARE_EMAIL_FROM;
  if (env.EMAIL && cloudflareFrom) {
    try {
      const response = await env.EMAIL.send({
        to: message.to,
        from: cloudflareFrom,
        subject: message.subject,
        html: message.htmlBody,
        text: message.textBody,
      });

      return {
        ok: true,
        provider: "cloudflare-email",
        status: 202,
        body: JSON.stringify(response),
      };
    } catch (error) {
      return {
        ok: false,
        provider: "cloudflare-email",
        status: 502,
        body: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const token = env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_SERVER_TOKEN;
  const from = env.POSTMARK_FROM_EMAIL || process.env.POSTMARK_FROM_EMAIL;

  if (!token || !from) {
    return {
      ok: false,
      skipped: true,
      reason: "No outbound email sender is configured. Configure Cloudflare EMAIL + CLOUDFLARE_EMAIL_FROM or Postmark secrets.",
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
      Attachments: message.attachments?.map((attachment) => ({
        Name: attachment.name,
        Content: attachment.content,
        ContentType: attachment.contentType,
      })),
      MessageStream: "outbound",
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}
