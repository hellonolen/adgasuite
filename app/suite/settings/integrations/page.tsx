"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type IntegrationStatus = "configured" | "needs_setup" | "not_configured" | "bound" | "unknown";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  docsHref: string;
  status: IntegrationStatus;
}

const STATUS_LABEL: Record<IntegrationStatus, { label: string; tone: "ok" | "warn" | "muted" }> = {
  configured: { label: "Configured", tone: "ok" },
  bound: { label: "Bound", tone: "ok" },
  needs_setup: { label: "Needs setup", tone: "warn" },
  not_configured: { label: "Not configured", tone: "warn" },
  unknown: { label: "Checking…", tone: "muted" },
};

const BASE_INTEGRATIONS: Integration[] = [
  {
    id: "postmark",
    name: "Postmark",
    category: "Transactional email",
    description: "Sends magic-link logins, digest emails, and outbound deal communications.",
    docsHref: "https://postmarkapp.com/developer",
    status: "unknown",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Optional. Card processing for invoicing flows alongside Whop subscriptions.",
    docsHref: "https://docs.stripe.com",
    status: "not_configured",
  },
  {
    id: "whop",
    name: "Whop",
    category: "Subscription billing",
    description: "Primary subscription provider. Drives plan, seat count, and renewal data.",
    docsHref: "https://dev.whop.com",
    status: "unknown",
  },
  {
    id: "r2",
    name: "Cloudflare R2",
    category: "Object storage",
    description: "Stores documents, uploads, and rendered assets behind signed URLs.",
    docsHref: "https://developers.cloudflare.com/r2",
    status: "unknown",
  },
];

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(BASE_INTEGRATIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((health) => {
        if (cancelled || !health) return;
        setIntegrations((prev) =>
          prev.map((item) => {
            if (item.id === "postmark") {
              const ok = Boolean(health?.env?.POSTMARK_SERVER_TOKEN ?? health?.bindings?.postmark);
              return { ...item, status: ok ? "configured" : "needs_setup" };
            }
            if (item.id === "whop") {
              const ok = Boolean(health?.env?.WHOP_API_KEY ?? health?.bindings?.whop);
              return { ...item, status: ok ? "configured" : "needs_setup" };
            }
            if (item.id === "r2") {
              const ok = Boolean(health?.bindings?.r2 ?? health?.bindings?.R2);
              return { ...item, status: ok ? "bound" : "needs_setup" };
            }
            return item;
          }),
        );
      })
      .catch(() => {
        // Health may not be wired; leave defaults.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const meta = STATUS_LABEL[loading && integration.status === "unknown" ? "unknown" : integration.status];
          return (
            <Card key={integration.id} className="min-w-0">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {integration.category}
                    </p>
                    <CardTitle className="mt-1.5 text-lg">{integration.name}</CardTitle>
                  </div>
                  <Badge
                    variant={meta.tone === "ok" ? "default" : meta.tone === "warn" ? "outline" : "secondary"}
                    className={
                      meta.tone === "warn"
                        ? "border-amber-300/70 bg-amber-50 text-amber-900"
                        : meta.tone === "muted"
                          ? "bg-muted text-muted-foreground"
                          : ""
                    }
                  >
                    {meta.label}
                  </Badge>
                </div>
                <CardDescription className="mt-2">{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={integration.docsHref} target="_blank" rel="noreferrer">
                      Configure
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={integration.docsHref} target="_blank" rel="noreferrer">
                      Docs
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connecting new providers</CardTitle>
          <CardDescription>
            Integration credentials live in Cloudflare environment bindings. Add a new key in the admin surface, then it appears here automatically.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
