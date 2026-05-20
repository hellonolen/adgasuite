export const platformConfig = {
  domain: "adga.ai",
  productName: "ADGA Suite",
  ownerEmail: "hellonolen@gmail.com",
  adminEmails: ["hellonolen@gmail.com", "kamarokyle5@gmail.com"],
  localAdminBypass: process.env.NODE_ENV !== "production",
  emailProvider: "postmark",
  paymentProvider: "whop",
  aiRuntime: "cloudflare-worker-ai",
  aiModel: "Kimi 2.6",
} as const;
