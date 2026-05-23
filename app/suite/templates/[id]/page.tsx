import { notFound } from "next/navigation";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import TemplateDetailClient from "@/components/suite/workspaces/TemplateDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) return { title: "Template not found — ADGA Suite" };
  return {
    title: `${template.name} template — ADGA Suite`,
    description: template.description,
  };
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();
  return <TemplateDetailClient template={template} />;
}
