// Conductor handler: skills/dealflow-template-materialization.skill.md
//
// Turns a deal intent into a populated canvas. Mirrors buildInitial() ring
// layout from components/suite/DealFlow.tsx so the operator's first view of
// a new dealflow matches the hero — never a blank page.

import { publish } from "@/lib/events/bus";
import { createDealFlow, createDealFlowEdge, createDealFlowNode } from "@/lib/server/repository";
import { nowIso } from "@/lib/server/id";
import type { SkillContext } from "@/lib/agents/skill-registry";

const CENTER_X = 480;
const CENTER_Y = 320;
const RING_INNER = 280;
const RING_OUTER = 460;

type Kind = "company" | "contact" | "bank" | "group" | "document" | "task" | "meeting" | "action";
type Status = "neutral" | "active" | "warning" | "overdue";
type Ring = "inner" | "outer";
interface TemplateNode {
  suffix: string;
  kind: Kind;
  label: string;
  sublabel: string;
  status: Status;
  ring: Ring;
}

const TEMPLATES: Record<string, TemplateNode[]> = {
  starter: [
    { suffix: "company",  kind: "company",  label: "Add company name",    sublabel: "Counterparty",       status: "neutral", ring: "inner" },
    { suffix: "contact",  kind: "contact",  label: "Add primary contact", sublabel: "Decision maker",     status: "neutral", ring: "inner" },
    { suffix: "bank",     kind: "bank",     label: "Add capital source",  sublabel: "Lender / source",    status: "neutral", ring: "inner" },
    { suffix: "people",   kind: "group",    label: "People",              sublabel: "Add contacts",       status: "neutral", ring: "inner" },
    { suffix: "document", kind: "document", label: "First document",      sublabel: "Add LOI / IOI",      status: "warning", ring: "outer" },
    { suffix: "task",     kind: "task",     label: "Next action",         sublabel: "Define step",        status: "active",  ring: "outer" },
    { suffix: "meeting",  kind: "meeting",  label: "First meeting",       sublabel: "Schedule",           status: "neutral", ring: "outer" },
  ],
  acquisition: [
    { suffix: "company",     kind: "company",  label: "Target company",       sublabel: "Acquisition target",  status: "active",  ring: "inner" },
    { suffix: "contact",     kind: "contact",  label: "Seller principal",     sublabel: "Decision authority",  status: "active",  ring: "inner" },
    { suffix: "bank",        kind: "bank",     label: "Debt financing",       sublabel: "Lender group",        status: "warning", ring: "inner" },
    { suffix: "people",      kind: "group",    label: "Diligence team",       sublabel: "Add stakeholders",    status: "neutral", ring: "inner" },
    { suffix: "doc_loi",     kind: "document", label: "LOI / term sheet",     sublabel: "Add draft",           status: "warning", ring: "outer" },
    { suffix: "doc_qofe",    kind: "document", label: "Quality of earnings",  sublabel: "Engage QofE provider",status: "neutral", ring: "outer" },
    { suffix: "task_diligence", kind: "task",  label: "Run diligence checklist", sublabel: "Open items",       status: "active",  ring: "outer" },
    { suffix: "meeting_mgmt",kind: "meeting",  label: "Management meeting",   sublabel: "Schedule",            status: "neutral", ring: "outer" },
  ],
  "capital-raise": [
    { suffix: "company",     kind: "company",  label: "Issuer / company",     sublabel: "Raising entity",      status: "active",  ring: "inner" },
    { suffix: "contact_lead",kind: "contact",  label: "Lead investor",        sublabel: "Anchor",              status: "active",  ring: "inner" },
    { suffix: "bank_synd",   kind: "bank",     label: "Syndicate",            sublabel: "Add participants",    status: "neutral", ring: "inner" },
    { suffix: "investors",   kind: "group",    label: "Investor group",       sublabel: "Add LPs",             status: "neutral", ring: "inner" },
    { suffix: "doc_deck",    kind: "document", label: "Pitch deck",           sublabel: "Latest version",      status: "warning", ring: "outer" },
    { suffix: "doc_model",   kind: "document", label: "Financial model",      sublabel: "Forecast attached",   status: "warning", ring: "outer" },
    { suffix: "task_close",  kind: "task",     label: "Close commitments",    sublabel: "Track signed docs",   status: "active",  ring: "outer" },
    { suffix: "meeting_pitch", kind: "meeting",label: "Pitch meeting",        sublabel: "Schedule",            status: "neutral", ring: "outer" },
  ],
  partnership: [
    { suffix: "company",  kind: "company",  label: "Partner company",         sublabel: "Counterparty",       status: "active",  ring: "inner" },
    { suffix: "contact",  kind: "contact",  label: "Partner lead",            sublabel: "Primary contact",    status: "active",  ring: "inner" },
    { suffix: "doc_msa",  kind: "document", label: "Master agreement",        sublabel: "Draft",              status: "warning", ring: "outer" },
    { suffix: "task_scope", kind: "task",   label: "Define partnership scope", sublabel: "Open",              status: "active",  ring: "outer" },
    { suffix: "meeting",  kind: "meeting",  label: "Kickoff",                 sublabel: "Schedule",           status: "neutral", ring: "outer" },
  ],
  licensing: [
    { suffix: "company",  kind: "company",  label: "Licensee",                sublabel: "Target",             status: "active",  ring: "inner" },
    { suffix: "contact",  kind: "contact",  label: "Business owner",          sublabel: "Decision maker",     status: "active",  ring: "inner" },
    { suffix: "doc_ip",   kind: "document", label: "IP schedule",             sublabel: "Attach catalog",     status: "warning", ring: "outer" },
    { suffix: "task_terms", kind: "task",   label: "Negotiate royalty terms", sublabel: "Open",               status: "active",  ring: "outer" },
    { suffix: "meeting",  kind: "meeting",  label: "Terms call",              sublabel: "Schedule",           status: "neutral", ring: "outer" },
  ],
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export interface DealflowMaterializationInput {
  organization_id: string;
  template_id?: string;
  name: string;
  actor_email?: string | null;
  deal_id?: string | null;
}

export interface DealflowMaterializationOutput {
  map_id: string;
  template_id: string;
  node_count: number;
  edge_count: number;
}

export async function dealflowTemplateMaterialization(
  context: SkillContext,
  input: DealflowMaterializationInput,
): Promise<DealflowMaterializationOutput> {
  if (!context.env.DB) throw new Error("dealflow-template-materialization requires D1.");
  const templateId = input.template_id || "starter";
  const template = TEMPLATES[templateId] || TEMPLATES.starter;

  const map = await createDealFlow(context.env.DB, {
    name: input.name,
    organization_id: input.organization_id,
    template: templateId,
    deal_id: input.deal_id ?? null,
    created_by_user_id: input.actor_email || null,
  });

  const inner = template.filter((n) => n.ring === "inner");
  const outer = template.filter((n) => n.ring === "outer");
  let nodeCount = 0;
  let edgeCount = 0;

  const place = async (list: TemplateNode[], radius: number, offsetDeg: number) => {
    if (list.length === 0) return;
    const step = 360 / list.length;
    for (let i = 0; i < list.length; i += 1) {
      const node = list[i];
      const angle = offsetDeg + i * step;
      const pos = polar(CENTER_X, CENTER_Y, radius, angle);
      const nodeId = `${map.id}__${node.suffix}`;
      await createDealFlowNode(context.env.DB, map.id, {
        id: nodeId,
        kind: node.kind,
        label: node.label,
        sublabel: node.sublabel,
        status: node.status,
        position_x: pos.x - 100,
        position_y: pos.y - 30,
      });
      nodeCount += 1;

      const sourceFromInner = node.ring === "inner";
      await createDealFlowEdge(context.env.DB, map.id, {
        id: `${map.id}__edge_${node.suffix}`,
        source_node_id: sourceFromInner ? nodeId : map.id,
        target_node_id: sourceFromInner ? map.id : nodeId,
      });
      edgeCount += 1;

      await publish(context.env.DB, {
        organization_id: input.organization_id,
        event_type: "dealflow.node_added",
        actor_type: context.actor_type,
        actor_id: context.actor_id,
        resource_type: "dealflow_node",
        resource_id: nodeId,
        payload: { map_id: map.id, node_id: nodeId, kind: node.kind, source: "template_materialization" },
      }).catch(() => null);
    }
  };

  await place(inner, RING_INNER, 30);
  await place(outer, RING_OUTER, 0);

  await publish(context.env.DB, {
    organization_id: input.organization_id,
    event_type: "deal.created",
    actor_type: context.actor_type,
    actor_id: context.actor_id,
    resource_type: "dealflow_map",
    resource_id: map.id,
    payload: {
      map_id: map.id,
      template: templateId,
      node_count: nodeCount,
      edge_count: edgeCount,
      created_at: nowIso(),
    },
  }).catch(() => null);

  return { map_id: map.id, template_id: templateId, node_count: nodeCount, edge_count: edgeCount };
}
