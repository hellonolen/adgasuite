import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.security.title,
  description: PAGE_SEO.security.description,
  openGraph: { title: PAGE_SEO.security.title, description: PAGE_SEO.security.description },
  twitter: { title: PAGE_SEO.security.title, description: PAGE_SEO.security.description },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
