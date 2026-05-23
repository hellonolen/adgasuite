import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DealTemplate } from "@/lib/templates";

interface TemplateCardProps {
  template: DealTemplate;
}

const CATEGORY_COLORS: Record<DealTemplate["category"], string> = {
  Capital: "bg-[#5d2cd6]/10 text-[#5d2cd6] border-[#5d2cd6]/20",
  "M&A": "bg-blue-50 text-blue-700 border-blue-200",
  "Real Estate": "bg-amber-50 text-amber-800 border-amber-200",
  Commercial: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Sales: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function TemplateCard({ template }: TemplateCardProps) {
  const nodeCount = template.nodes.length;
  const edgeCount = template.edges.length;

  return (
    <Link
      href={`/suite/templates/${template.id}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d2cd6] focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#5d2cd6]/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{template.name}</CardTitle>
            <Badge variant="outline" className={CATEGORY_COLORS[template.category]}>
              {template.category}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">{template.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#5d2cd6]" />
              {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              {edgeCount} {edgeCount === 1 ? "edge" : "edges"}
            </span>
            <span className="ml-auto text-[#5d2cd6] opacity-0 transition-opacity group-hover:opacity-100">
              Preview →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
