import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up | ADGA",
  description: "Create your ADGA account.",
  openGraph: {
    title: "Sign up | ADGA",
    description: "Create your ADGA account.",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
