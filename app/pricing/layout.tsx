import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.pricing.title,
  description: PAGE_SEO.pricing.description,
  openGraph: { title: PAGE_SEO.pricing.title, description: PAGE_SEO.pricing.description },
  twitter: { title: PAGE_SEO.pricing.title, description: PAGE_SEO.pricing.description },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
