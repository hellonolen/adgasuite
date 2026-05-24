"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useSavePanel(panel: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const save = useCallback(
    async (values: Record<string, unknown>) => {
      setStatus("saving");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ panel, values }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Save failed (${response.status})`);
        }
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 2400);
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Save failed");
      }
    },
    [panel],
  );

  return { status, errorMessage, save };
}

export function PanelSaveBar({
  status,
  errorMessage,
  onSave,
  disabled,
}: {
  status: SaveStatus;
  errorMessage: string | null;
  onSave: () => void;
  disabled?: boolean;
}) {
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Try again"
          : "Save changes";

  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-8 border-t border-border bg-background/85 px-5 py-3.5 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <p
          className={cn(
            "text-xs",
            status === "saved" && "text-primary",
            status === "error" && "text-destructive",
            (status === "idle" || status === "saving") && "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {status === "saved" && "Changes saved."}
          {status === "saving" && "Saving your changes…"}
          {status === "error" && (errorMessage || "Could not save. Try again.")}
          {status === "idle" && "Unsaved changes are kept in this session only."}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={disabled || status === "saving"}
          aria-busy={status === "saving"}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { href: "/suite/settings/profile", label: "Profile", hint: "Identity, signature, defaults" },
  { href: "/suite/settings/notifications", label: "Notifications", hint: "Digest, alerts, webhooks" },
  { href: "/suite/settings/integrations", label: "Integrations", hint: "Email, payments, accounting, storage" },
  { href: "/suite/settings/billing", label: "Billing", hint: "Plan, seats, renewal" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <header className="mb-8 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage your profile, notifications, integrations, and billing for this workspace.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10">
        <nav aria-label="Settings sections" className="md:sticky md:top-10 md:self-start">
          <ul className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <li key={item.href} className="shrink-0 md:shrink">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/8 text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <span className="block">{item.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 hidden text-xs font-normal md:block",
                        isActive ? "text-muted-foreground" : "text-muted-foreground/80",
                      )}
                    >
                      {item.hint}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
