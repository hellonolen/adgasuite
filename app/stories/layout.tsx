import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.stories.title,
  description: PAGE_SEO.stories.description,
  openGraph: { title: PAGE_SEO.stories.title, description: PAGE_SEO.stories.description },
  twitter: { title: PAGE_SEO.stories.title, description: PAGE_SEO.stories.description },
};

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
