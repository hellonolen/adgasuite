import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/suite/TemplateCard";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";

export const metadata = {
  title: "Deal templates — ADGA Suite",
  description: "Start a deal from a proven shape. 13 templates from acquisition to high-ticket sale.",
};

export default function TemplatesGalleryPage() {
  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
              Templates
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0d0c0a] sm:text-4xl">
              Start a deal from a proven shape
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#6b6760] sm:text-base">
              Every template opens into a pre-populated mindmap. Pick the closest fit, then edit nodes,
              add stakeholders, and ship.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/suite">Back to suite</Link>
            </Button>
            <Button asChild className="bg-[#5d2cd6] hover:bg-[#4920b3]">
              <Link href="/suite/maps/new">New map</Link>
            </Button>
          </div>
        </div>

        {/* Grouped by category */}
        <div className="space-y-12">
          {TEMPLATE_CATEGORIES.map((category) => {
            const items = TEMPLATES.filter((t) => t.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#6b6760]">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
