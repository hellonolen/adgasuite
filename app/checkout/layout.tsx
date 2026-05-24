import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Checkout | ADGA",
  description: "Start your ADGA subscription through secure Stripe checkout.",
  openGraph: {
    title: "Checkout | ADGA",
    description: "Start your ADGA subscription through secure Stripe checkout.",
  },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
