import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.policies.title,
  description: PAGE_SEO.policies.description,
  openGraph: { title: PAGE_SEO.policies.title, description: PAGE_SEO.policies.description },
  twitter: { title: PAGE_SEO.policies.title, description: PAGE_SEO.policies.description },
};

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
