import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/suite/admin", label: "Overview", match: "exact" as const },
  { href: "/suite/admin/team", label: "Team", match: "prefix" as const },
  { href: "/suite/admin/roles", label: "Roles", match: "prefix" as const },
  { href: "/suite/admin/audit", label: "Audit log", match: "prefix" as const },
  { href: "/suite/admin/workspace", label: "Workspace", match: "prefix" as const },
];

interface AdminLayoutProps {
  pathname: string;
  ownerEmail: string;
  organizationName: string;
  children: ReactNode;
}

function isActive(itemHref: string, match: "exact" | "prefix", current: string) {
  if (match === "exact") return current === itemHref;
  return current === itemHref || current.startsWith(`${itemHref}/`);
}

export function AdminLayout({ pathname, ownerEmail, organizationName, children }: AdminLayoutProps) {
  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <div className="border-b border-[var(--rule,#e8e4de)] bg-white">
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
                Admin · {organizationName}
              </div>
              <div className="text-base font-semibold text-[#0d0c0a]">Workspace controls</div>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-xs text-[#6b6760] md:flex">
            <span className="text-[10px] uppercase tracking-[0.12em]">Signed in</span>
            <span className="font-medium text-[#0d0c0a]">{ownerEmail}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <nav className="rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-2">
            <ul className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href, item.match, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-[#f1ede8] font-semibold text-[#0d0c0a]"
                          : "text-[#4f485d] hover:bg-[#f6f3fb] hover:text-[#0d0c0a]",
                      )}
                    >
                      <span>{item.label}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-[#5d2cd6]" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 border-t border-[var(--rule,#e8e4de)] px-3 pt-3 text-[10px] uppercase tracking-[0.16em] text-[#6b6760]">
              Owner only
            </div>
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">Admin</div>
        <h1 className="mt-1 text-2xl font-semibold text-[#0d0c0a]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-[#6b6760]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--rule,#e8e4de)] bg-white p-10 text-center">
      <div className="text-base font-semibold text-[#0d0c0a]">{title}</div>
      {description && <p className="mt-2 text-sm text-[#6b6760]">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function AdminForbidden({ email }: { email: string | null }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9f7f4] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-8 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">403</div>
        <h1 className="mt-2 text-2xl font-semibold text-[#0d0c0a]">Admin access required</h1>
        <p className="mt-2 text-sm text-[#6b6760]">
          {email
            ? `${email} is signed in but does not have workspace owner privileges.`
            : "Sign in as the workspace owner to manage these settings."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/suite"
            className="inline-flex items-center justify-center rounded-md bg-[#5d2cd6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4a23ac]"
          >
            Back to suite
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b6760] hover:text-[#0d0c0a]"
          >
            Sign in as a different user
          </Link>
        </div>
      </div>
    </main>
  );
}
