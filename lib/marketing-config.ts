/**
 * Marketing site configuration.
 *
 * Single source of truth for brand strings, navigation, footer columns,
 * primary CTAs, and copyright. Update here once — every page reflects it.
 *
 * Do NOT hardcode the same strings inside page components or layout
 * components. Always pull from this file.
 */

export const BRAND = {
  name: "ADGA",
  tagline: "Deal flow platform",
  footerDescription:
    "A dealflow workspace for closers, dealmakers, and operators: leads, contacts, files, invoices, and follow-up tied to the deal.",
  productName: "ADGA Suite",
} as const;

export const PRIMARY_CTA = {
  label: "Start closing deals",
  href: "/pricing",
} as const;

export const SECONDARY_NAV_CTA = {
  label: "Sign in",
  href: "/login",
} as const;

export type NavLink = {
  label: string;
  href: string;
};

export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { label: "Plan", href: "/plan" },
  { label: "Process", href: "/process" },
  { label: "Use Cases", href: "/cases" },
  { label: "Resources", href: "/5-secrets" },
  { label: "Pricing", href: "/pricing" },
];

export type FooterColumn = {
  heading: string;
  links: ReadonlyArray<NavLink>;
};

export const FOOTER_COLUMNS: ReadonlyArray<FooterColumn> = [
  {
    heading: "Product",
    links: [
      { label: "Plan", href: "/plan" },
      { label: "Process", href: "/process" },
      { label: "Use Cases", href: "/cases" },
      { label: "5 Secrets", href: "/5-secrets" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Stories", href: "/stories" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Suite",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Deals", href: "/login?next=/suite/deals" },
      { label: "Onboarding", href: "/onboarding" },
      { label: PRIMARY_CTA.label, href: PRIMARY_CTA.href },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Security", href: "/security" },
      { label: "Policy Center", href: "/policies" },
      { label: "Support", href: "/support" },
    ],
  },
];

/**
 * Bottom-row footer links — appears next to the copyright on the right side.
 */
export const FOOTER_END_LINKS: ReadonlyArray<NavLink> = [
  { label: "Policy Center", href: "/policies" },
  { label: "Security", href: "/security" },
  { label: "Support", href: "/support" },
  { label: "Contact", href: "/contact" },
];

/**
 * Year is computed at render time so the copyright never goes stale.
 */
export function getCopyright(): string {
  const year = new Date().getFullYear();
  return `© ${year} ${BRAND.name} · All rights reserved`;
}

/**
 * Site-wide SEO defaults. Per-page metadata can override any of these.
 */
export const SEO = {
  siteUrl: "https://adga.ai",
  defaultTitle: "ADGA — The deal platform for closers",
  titleTemplate: "%s · ADGA",
  defaultDescription:
    "Designed for the closers, dealmakers, and operators who carry the number. Every contact, every call, every commitment locked to the deal — surfaced when it’s time to act.",
  keywords: [
    "deal flow platform",
    "sales pipeline software",
    "CRM for closers",
    "deal management",
    "deal tracking",
    "sales pipeline management",
    "CRM for dealmakers",
    "M&A deal management",
    "agency deal flow",
    "closer CRM",
  ],
  ogImage: "/og-default.png",
  locale: "en_US",
  twitterHandle: "@adga",
} as const;

/**
 * Per-page SEO metadata. Title is rendered through SEO.titleTemplate.
 */
export const PAGE_SEO = {
  home: {
    title: "Close more deals",
    description:
      "Leverage this agentic deal system so you can open, position, and close more deals without missing a beat. Designed for the closers, dealmakers, and operators who carry the number.",
  },
  plan: {
    title: "Keep momentum in your deal",
    description:
      "Every contact, file, call, commitment, and next move locked to the deal — surfaced when it’s time to act. Designed for closers, dealmakers, and operators who refuse to lose deals to slipped follow-ups.",
  },
  process: {
    title: "Dealmakers close deals",
    description:
      "The deal process designed to help closers, dealmakers, and operators run their deals through the same proven path — from lead to expand.",
  },
  cases: {
    title: "Deals from closers",
    description:
      "Acquisitions, capital raises, M&A, partnerships, licensing, and high-ticket sales — closers, dealmakers, and operators running them inside ADGA.",
  },
  pricing: {
    title: "Join our community",
    description:
      "Whether you run your book alone, close with a team, or operate across an enterprise — ADGA scales with the way you already close. Same deal flow, every tier.",
  },
  stories: {
    title: "Stories from the closers running ADGA",
    description:
      "How dealmakers, operators, and closers use ADGA to keep every deal moving and close more of what’s already in their pipeline.",
  },
  about: {
    title: "About",
    description:
      "ADGA is built for closers, dealmakers, advisors, and operators who need every lead, contact, file, invoice, and next action attached to the deal.",
  },
  resources: {
    title: "Five Secrets to Not Losing Million-Dollar Deals",
    description:
      "Get the private ADGA guide for protecting high-stakes conversations before timing, trust, or follow-up costs you the deal.",
  },
  security: {
    title: "Security",
    description:
      "How ADGA protects your deal data, your contacts, your documents, and your closes.",
  },
  signup: {
    title: "Start closing deals",
    description:
      "Open your ADGA workspace and start running deals in one place. For the closers, dealmakers, and operators who carry the number.",
  },
  login: {
    title: "Sign in",
    description: "Sign in to your ADGA workspace.",
  },
  policies: {
    title: "Policy Center",
    description:
      "Every policy that governs how ADGA collects, stores, secures, and handles your data — privacy, terms, SMS, email, cookies, acceptable use, and data processing in one place.",
  },
  support: {
    title: "Support",
    description:
      "ADGA support runs inside the workspace. Questions resolve on the deal itself — never away from where the deal lives.",
  },
  contact: {
    title: "Contact",
    description: "Every interaction with ADGA runs through the workspace, on the deal itself. The deal is the conversation.",
  },
} as const;
