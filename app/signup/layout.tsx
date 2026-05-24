import type { Metadata } from "next";
import { PAGE_SEO } from "@/lib/marketing-config";

export const metadata: Metadata = {
  title: PAGE_SEO.signup.title,
  description: PAGE_SEO.signup.description,
  openGraph: { title: PAGE_SEO.signup.title, description: PAGE_SEO.signup.description },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
