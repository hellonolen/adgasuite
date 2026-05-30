// Next.js App Router auto-generated sitemap. Lists every public marketing page
// so search engines + AI crawlers find them. /suite/* and /api/* deliberately
// excluded (gated content, no indexing value).

import type { MetadataRoute } from "next";

const HOST = "https://adga.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // priority: 1.0 = homepage, 0.9 = pricing/cases, 0.8 = product pages, 0.5 = info pages
  const pages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "/",              changeFrequency: "weekly",  priority: 1.0 },
    { path: "/pricing",       changeFrequency: "weekly",  priority: 0.9 },
    { path: "/cases",         changeFrequency: "monthly", priority: 0.9 },
    { path: "/use-cases",     changeFrequency: "monthly", priority: 0.9 },
    { path: "/process",       changeFrequency: "monthly", priority: 0.8 },
    { path: "/deal-process",  changeFrequency: "monthly", priority: 0.8 },
    { path: "/plan",          changeFrequency: "monthly", priority: 0.8 },
    { path: "/about",         changeFrequency: "monthly", priority: 0.7 },
    { path: "/stories",       changeFrequency: "weekly",  priority: 0.7 },
    { path: "/resources",     changeFrequency: "weekly",  priority: 0.7 },
    { path: "/security",      changeFrequency: "monthly", priority: 0.6 },
    { path: "/policies",      changeFrequency: "yearly",  priority: 0.5 },
    { path: "/support",       changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact",       changeFrequency: "monthly", priority: 0.5 },
    { path: "/login",         changeFrequency: "yearly",  priority: 0.4 },
    { path: "/signup",        changeFrequency: "yearly",  priority: 0.4 },
  ];

  return pages.map((p) => ({
    url: `${HOST}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
