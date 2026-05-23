"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/suite/affiliate", label: "Overview", description: "KPIs at a glance" },
  { href: "/suite/affiliate/links", label: "Links", description: "Referral URL + UTM builder" },
  { href: "/suite/affiliate/payouts", label: "Payouts", description: "Owed and paid history" },
  { href: "/suite/affiliate/leaderboard", label: "Leaderboard", description: "Top affiliates this period" },
];

interface AffiliateLayoutProps {
  email: string;
  referralCode?: string | null;
  children: React.ReactNode;
}

export function AffiliateLayout({ email, referralCode, children }: AffiliateLayoutProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <header className="border-b border-[var(--rule,#e8e4de)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/suite"
              className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b6760] hover:text-[#0d0c0a]"
            >
              ← Suite
            </Link>
            <div className="h-4 w-px bg-[var(--rule,#e8e4de)]" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                Affiliate Center
              </div>
              <div className="text-base font-semibold text-[#0d0c0a]">{email}</div>
            </div>
          </div>
          {referralCode && (
            <div className="hidden items-center gap-2 rounded-full border border-[#5d2cd6]/20 bg-[#5d2cd6]/5 px-3 py-1.5 sm:flex">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                Your code
              </span>
              <span className="font-mono text-sm font-semibold text-[#0d0c0a]">{referralCode}</span>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        <nav
          aria-label="Affiliate sections"
          className="w-full shrink-0 lg:w-64"
        >
          <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/suite/affiliate"
                  ? pathname === "/suite/affiliate"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-lg border px-4 py-3 transition-colors",
                      isActive
                        ? "border-[#5d2cd6]/30 bg-[#5d2cd6]/5 text-[#0d0c0a]"
                        : "border-transparent text-[#6b6760] hover:border-[var(--rule,#e8e4de)] hover:bg-white",
                    )}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-0.5 hidden text-xs text-[#6b6760] lg:block">{item.description}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
