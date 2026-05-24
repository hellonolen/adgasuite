"use client";

/**
 * Template detail workspace — rendered as children of the suite layout's workspace area.
 * The shell (sidebar, topbar, voice panel) is provided by the layout; this file owns
 * ONLY the template breakdown UI. No <main>, no SuiteClient — both come from layout.
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DealTemplate, TemplateNode, TemplateNodeKind } from "@/lib/templates";

const KIND_META: Record<TemplateNodeKind, { label: string; color: string; bg: string }> = {
  contact: { label: "Contact", color: "#16a34a", bg: "bg-green-50 border-green-200" },
  company: { label: "Company", color: "#0ea5e9", bg: "bg-sky-50 border-sky-200" },
  document: { label: "File", color: "#f59e0b", bg: "bg-amber-50 border-amber-200" },
  task: { label: "Task", color: "#a855f7", bg: "bg-purple-50 border-purple-200" },
  call: { label: "Call", color: "#ef4444", bg: "bg-red-50 border-red-200" },
  meeting: { label: "Meeting", color: "#3b82f6", bg: "bg-blue-50 border-blue-200" },
  action: { label: "Next", color: "#5d2cd6", bg: "bg-[#5d2cd6]/5 border-[#5d2cd6]/20" },
};

function NodePill({ node }: { node: TemplateNode }) {
  const meta = KIND_META[node.kind];
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${meta.bg}`}>
      <div
        className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em]"
        style={{ color: meta.color }}
      >
        {meta.label}
      </div>
      <div className="text-sm font-semibold leading-tight text-[#0d0c0a]">{node.label}</div>
      {node.sublabel && <div className="mt-0.5 text-xs text-[#6b6760]">{node.sublabel}</div>}
    </div>
  );
}

export interface TemplateDetailClientProps {
  template: DealTemplate;
}

export default function TemplateDetailClient({ template }: TemplateDetailClientProps) {
  // Group nodes by kind for the preview rail
  const grouped = template.nodes.reduce<Record<TemplateNodeKind, TemplateNode[]>>(
    (acc, node) => {
      acc[node.kind] = acc[node.kind] || [];
      acc[node.kind].push(node);
      return acc;
    },
    {} as Record<TemplateNodeKind, TemplateNode[]>,
  );

  const kindOrder: TemplateNodeKind[] = [
    "company",
    "contact",
    "document",
    "task",
    "call",
    "meeting",
    "action",
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-14">
      {/* Breadcrumb */}
      <div className="mb-6 text-xs text-[#6b6760]">
        <Link href="/suite/templates" className="hover:text-[#5d2cd6]">
          Templates
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#0d0c0a]">{template.name}</span>
      </div>

      {/* Header */}
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-3 border-[#5d2cd6]/20 bg-[#5d2cd6]/5 text-[#5d2cd6]">
            {template.category}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0d0c0a] sm:text-4xl">
            {template.name}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6b6760] sm:text-base">
            {template.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-[#6b6760]">
            <span>{template.nodes.length} nodes</span>
            <span className="text-[#cbcbc4]">·</span>
            <span>{template.edges.length} edges</span>
            <span className="text-[#cbcbc4]">·</span>
            <span>Deal type: {template.deal_type}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button asChild variant="outline">
            <Link href="/suite/templates">All templates</Link>
          </Button>
          <Button asChild className="bg-[#5d2cd6] hover:bg-[#4920b3]">
            <Link href={`/suite/deals/new?template=${template.id}`}>Use this template</Link>
          </Button>
        </div>
      </div>

      {/* Preview */}
      {template.nodes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empty canvas</CardTitle>
            <CardDescription>
              Just the deal node — perfect when none of the shapes fit. You build the canvas yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center rounded-lg border border-dashed border-[#cbcbc4] bg-white py-16">
              <div className="rounded-2xl bg-gradient-to-b from-[#5d2cd6] to-[#4920b3] px-6 py-5 text-white shadow-lg">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                  Deal
                </div>
                <div className="mt-1 text-base font-semibold">New custom deal</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Node groups */}
          <div className="space-y-6">
            {kindOrder
              .filter((kind) => grouped[kind]?.length)
              .map((kind) => {
                const meta = KIND_META[kind];
                const items = grouped[kind];
                return (
                  <section key={kind}>
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#6b6760]">
                        {meta.label} · {items.length}
                      </h2>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((node) => (
                        <NodePill key={node.id} node={node} />
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>

          {/* Sidebar summary */}
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">What you get</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-[#6b6760]">
                <p>
                  A pre-populated DealFlow with {template.nodes.length} entities connected to the
                  deal anchor.
                </p>
                <p>Edit, rename or remove any node after the dealflow opens.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Default layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-[#6b6760]">
                <p>
                  Hub-and-spoke: the deal node sits at the center; entities are placed in two
                  concentric rings.
                </p>
                <p>Inner ring: contacts, companies, next actions.</p>
                <p>Outer ring: documents, tasks, calls, meetings.</p>
              </CardContent>
            </Card>

            <Button asChild size="lg" className="w-full bg-[#5d2cd6] hover:bg-[#4920b3]">
              <Link href={`/suite/deals/new?template=${template.id}`}>Use this template</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
