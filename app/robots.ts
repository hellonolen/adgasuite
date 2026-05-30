// Robots config. Allow indexing of marketing surface. Block private suite +
// API. Point all crawlers (including GPTBot, ClaudeBot for AI search) at the
// sitemap.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/suite/", "/api/", "/share/", "/onboarding", "/auth/", "/admin/"],
      },
    ],
    sitemap: "https://adga.ai/sitemap.xml",
    host: "https://adga.ai",
  };
}
