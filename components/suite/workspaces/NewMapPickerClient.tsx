"use client";

/**
 * Template picker for /suite/maps/new — rendered as children of the suite layout's
 * workspace area. The shell (sidebar, topbar, voice panel) is provided by the layout;
 * this file owns ONLY the picker UI. No <main>, no SuiteClient — both come from layout.
 */

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TEMPLATES, TEMPLATE_CATEGORIES, getTemplate, type DealTemplate } from "@/lib/templates";

type CreateState =
  | { kind: "idle" }
  | { kind: "creating"; templateId: string }
  | { kind: "wiring-pending"; message: string }
  | { kind: "error"; message: string };

interface CreatedMap {
  id: string;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 404) {
    const err = new Error("routes-not-ready");
    err.name = "RoutesNotReady";
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function createMapFromTemplate(template: DealTemplate, name: string): Promise<string> {
  // 1. Create the map shell
  const map = await postJSON<CreatedMap>("/api/maps", {
    name,
    template: template.id,
    deal_id: null,
  });

  // 2. Materialize each template node
  for (const node of template.nodes) {
    await postJSON(`/api/maps/${map.id}/nodes`, {
      template_node_id: node.id,
      kind: node.kind,
      label: node.label,
      sublabel: node.sublabel,
      status: node.status ?? "neutral",
    });
  }

  // 3. Materialize each edge (default: deal -> every node)
  for (const edge of template.edges) {
    await postJSON(`/api/maps/${map.id}/edges`, {
      source: edge.source,
      target: edge.target,
    });
  }

  return map.id;
}

export default function NewMapPickerClient() {
  return (
    <Suspense fallback={<div style={{ minHeight: 400 }} />}>
      <NewMapInner />
    </Suspense>
  );
}

function NewMapInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledTemplate = searchParams.get("template");

  const [selectedId, setSelectedId] = useState<string>(prefilledTemplate || "");
  const [state, setState] = useState<CreateState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const handleCreate = (template: DealTemplate) => {
    setState({ kind: "creating", templateId: template.id });
    startTransition(async () => {
      try {
        const mapId = await createMapFromTemplate(template, template.name);
        router.push(`/suite/map/${mapId}`);
      } catch (err) {
        if (err instanceof Error && err.name === "RoutesNotReady") {
          setState({
            kind: "wiring-pending",
            message: "Templates ready, persistence wiring in progress.",
          });
          return;
        }
        const message = err instanceof Error ? err.message : "Something went wrong creating the map.";
        setState({ kind: "error", message });
      }
    });
  };

  // If arriving with ?template=…&autostart=1, kick off immediately
  useEffect(() => {
    const autostart = searchParams.get("autostart");
    if (autostart === "1" && prefilledTemplate) {
      const t = getTemplate(prefilledTemplate);
      if (t) handleCreate(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = selectedId ? getTemplate(selectedId) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-14">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
            New map
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0d0c0a] sm:text-4xl">
            Pick a template to start
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6b6760] sm:text-base">
            Each template opens a fresh, pre-populated mindmap. You can edit everything after.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/suite/templates">Browse gallery</Link>
        </Button>
      </div>

      {/* Status banner */}
      {state.kind === "wiring-pending" && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">{state.message}</strong>{" "}
          The map APIs are not live yet — your template selection is preserved.
        </div>
      )}
      {state.kind === "error" && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <strong className="font-semibold">Could not create map.</strong> {state.message}
        </div>
      )}

      {/* Template picker grouped by category */}
      <div className="space-y-10">
        {TEMPLATE_CATEGORIES.map((category) => {
          const items = TEMPLATES.filter((t) => t.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#6b6760]">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((template) => {
                  const isSelected = selectedId === template.id;
                  const isCreatingThis =
                    state.kind === "creating" && state.templateId === template.id && isPending;
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                        isSelected
                          ? "border-[#5d2cd6] ring-2 ring-[#5d2cd6]/20"
                          : "hover:border-[#5d2cd6]/30"
                      }`}
                      onClick={() => setSelectedId(template.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          {template.nodes.length} nodes · {template.edges.length} edges
                        </span>
                        <Button
                          size="sm"
                          className={
                            isSelected
                              ? "bg-[#5d2cd6] hover:bg-[#4920b3]"
                              : "bg-zinc-900 hover:bg-zinc-700"
                          }
                          disabled={isCreatingThis || isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(template.id);
                            handleCreate(template);
                          }}
                        >
                          {isCreatingThis ? "Creating…" : "Use"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Sticky bottom CTA when something is selected but not yet started */}
      {selected && state.kind !== "creating" && (
        <div className="sticky bottom-4 mt-12 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-[#e8e4de] bg-white px-5 py-3 shadow-lg">
            <span className="text-sm text-[#6b6760]">
              Selected: <strong className="text-[#0d0c0a]">{selected.name}</strong>
            </span>
            <Button
              size="sm"
              className="bg-[#5d2cd6] hover:bg-[#4920b3]"
              disabled={isPending}
              onClick={() => handleCreate(selected)}
            >
              {isPending ? "Creating…" : "Create map"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
