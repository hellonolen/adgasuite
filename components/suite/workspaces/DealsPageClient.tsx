"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Archive, Check, Copy, Database, Edit3, ExternalLink, Fingerprint, History, LayoutTemplate, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

export interface DealsPageData {
  deals: Array<{
    id: string;
    name: string;
    stage: string;
    updated: string | null;
    nodeCount: number;
    storageState: "r2" | "metadata";
    source: "canvas" | "deal";
    value?: string | null;
    company?: string | null;
    primaryContact?: string | null;
    nextAction?: string | null;
    risk?: "new" | "active" | "at-risk" | "closing" | "won" | "archived";
    lastActivity?: string | null;
  }>;
}

function relTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const delta = Date.now() - t;
  const mins = Math.round(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.round(hours / 24);
  if (days < 30) return days + "d ago";
  return new Date(iso).toLocaleDateString();
}

function stageLabel(stage: string) {
  return stage
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function trackingNumber(id: string) {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 6) return digits.slice(-6);
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 900000;
  return String(100000 + hash).slice(-6);
}

function dealRisk(stage: string): NonNullable<DealsPageData["deals"][number]["risk"]> {
  const normalized = stage.toLowerCase();
  if (normalized.includes("won") || normalized.includes("closed")) return "won";
  if (normalized.includes("archive")) return "archived";
  if (normalized.includes("risk") || normalized.includes("stalled") || normalized.includes("overdue")) return "at-risk";
  if (normalized.includes("closing") || normalized.includes("contract") || normalized.includes("signature")) return "closing";
  if (normalized.includes("lead") || normalized.includes("new")) return "new";
  return "active";
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "at-risk", label: "At Risk" },
  { id: "closing", label: "Closing" },
  { id: "no-next-step", label: "No next step" },
  { id: "recent", label: "Recently updated" },
] as const;

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export default function DealsPageClient({ data }: { data: DealsPageData }) {
  const router = useRouter();
  const [items, setItems] = useState(data.deals);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newDealName, setNewDealName] = useState("Untitled deal");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const risk = item.risk || dealRisk(item.stage);
      if (filter === "active" && risk !== "active") return false;
      if (filter === "at-risk" && risk !== "at-risk") return false;
      if (filter === "closing" && risk !== "closing") return false;
      if (filter === "no-next-step" && item.nextAction) return false;
      if (filter === "recent") {
        const updated = item.updated ? new Date(item.updated).getTime() : 0;
        if (!updated || updated < recentCutoff) return false;
      }
      if (!q) return true;
      return `${item.name} ${item.stage} ${item.id} ${item.company || ""} ${item.primaryContact || ""} ${item.nextAction || ""}`.toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  const beginRename = (item: DealsPageData["deals"][number]) => {
    setEditingId(item.id);
    setDraftName(item.name);
    setError(null);
  };

  const saveRename = (item: DealsPageData["deals"][number]) => {
    const name = draftName.trim();
    if (!name) {
      setError("Deal name is required.");
      return;
    }
    const previous = items;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, name } : entry)));
    setEditingId(null);
    setError(null);

    startTransition(async () => {
      try {
        const endpoint = item.source === "canvas" ? `/api/dealflows/${encodeURIComponent(item.id)}` : `/api/deals/${encodeURIComponent(item.id)}`;
        await requestJson(endpoint, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        router.refresh();
      } catch (err) {
        setItems(previous);
        setError(err instanceof Error ? err.message : "Could not rename deal.");
      }
    });
  };

  const createDeal = () => {
    const name = newDealName.trim() || "Untitled deal";
    setError(null);
    startTransition(async () => {
      try {
        const created = await requestJson<{ dealFlow?: { id: string }; map?: { id: string }; id?: string }>("/api/dealflows", {
          method: "POST",
          body: JSON.stringify({ name, template: "blank-deal", deal_id: null }),
        });
        const id = created.dealFlow?.id || created.map?.id || created.id;
        if (!id) throw new Error("Deal was created without an ID.");
        router.push(`/suite/dealflow/${encodeURIComponent(id)}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create deal.");
      }
    });
  };

  const openDeal = (id: string) => {
    window.location.assign(`/suite/dealflow/${encodeURIComponent(id)}`);
  };

  return (
    <div className="deals-page-shell">
      <div className="page-h">
        <div>
          <h1>Deals</h1>
          <div className="sub">
            {items.length} {items.length === 1 ? "deal" : "deals"} ready to open on the canvas.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => setCreateOpen((open) => !open)}>
            <Plus aria-hidden="true" size={16} /> New deal
          </button>
          <Link className="btn primary" href="/suite/deals/new">
            <LayoutTemplate aria-hidden="true" size={16} /> From template
          </Link>
        </div>
      </div>

      <div className="deals-page-toolbar">
        <label className="deals-page-search">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search deals by name, ID, or stage"
          />
        </label>
        <div className="deals-page-count">{filtered.length} shown</div>
      </div>

      <div className="deals-page-filters" aria-label="Deal filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? "active" : ""}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="deals-page-system" aria-label="Deal operating model">
        <div>
          <Fingerprint aria-hidden="true" size={15} />
          <span>Six-digit tracking IDs</span>
        </div>
        <div>
          <Database aria-hidden="true" size={15} />
          <span>R2 stores the payload</span>
        </div>
        <div>
          <History aria-hidden="true" size={15} />
          <span>Every deal keeps an audit trail</span>
        </div>
      </div>

      {createOpen && (
        <section className="deals-page-create" aria-label="Create deal">
          <div>
            <div className="create-title">Create a deal square</div>
            <div className="create-sub">It opens directly into the canvas after creation.</div>
          </div>
          <input
            value={newDealName}
            onChange={(event) => setNewDealName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createDeal();
            }}
            aria-label="Deal name"
          />
          <button className="btn primary" type="button" disabled={isPending} onClick={createDeal}>
            <Plus aria-hidden="true" size={16} /> {isPending ? "Creating..." : "Create"}
          </button>
        </section>
      )}

      {error && <div className="deals-page-error">{error}</div>}

      <section>
        {filtered.length === 0 ? (
          <div className="deals-page-empty">
            <div>No deals yet</div>
            <p>Create a blank deal square or start from a template. Production workspaces stay empty until you add real customer records.</p>
            <button className="btn primary" type="button" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" size={16} /> New deal
            </button>
            <Link className="btn" href="/suite/deals/new">
              <LayoutTemplate aria-hidden="true" size={16} /> From template
            </Link>
          </div>
        ) : (
          <div className="deals-grid">
            {filtered.map((deal, index) => (
              <article
                key={deal.id}
                className="deal-square"
                data-accent={String((index % 5) + 1)}
                role="link"
                tabIndex={0}
                onClick={() => openDeal(deal.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") openDeal(deal.id);
                }}
              >
                <span className="deal-square-shine" aria-hidden="true" />
                <div className="deal-square-top">
                  <span className="deal-square-stage">{stageLabel(deal.stage)}</span>
                  <span className="deal-square-count">{deal.value || `${deal.nodeCount} nodes`}</span>
                </div>

                <div className="deal-square-body">
                  {editingId === deal.id ? (
                    <input
                      className="deal-square-input"
                      value={draftName}
                      autoFocus
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveRename(deal);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setEditingId(null);
                        }
                        event.stopPropagation();
                      }}
                    />
                  ) : (
                    <h2>{deal.name}</h2>
                  )}
                  <p>ID {trackingNumber(deal.id)}</p>
                  <dl className="deal-square-facts">
                    <div>
                      <dt>Company</dt>
                      <dd>{deal.company || "Unassigned"}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{deal.primaryContact || "No primary contact"}</dd>
                    </div>
                    <div>
                      <dt>Next</dt>
                      <dd>{deal.nextAction || "Needs next step"}</dd>
                    </div>
                  </dl>
                  <div className="deal-square-meta">
                    <span>{deal.storageState === "r2" ? "R2 payload" : "metadata pointer"}</span>
                    <span>{deal.nodeCount} nodes</span>
                  </div>
                </div>

                <div className="deal-square-footer">
                  <span>Updated {relTime(deal.updated)}</span>
                  <div className="deal-square-actions">
                    {editingId === deal.id ? (
                      <>
                        <button
                          type="button"
                          aria-label="Save deal name"
                          title="Save"
                          onClick={(event) => {
                            event.stopPropagation();
                            saveRename(deal);
                          }}
                        >
                          <Check aria-hidden="true" size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          title="Cancel"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingId(null);
                          }}
                        >
                          <X aria-hidden="true" size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          aria-label="Rename deal"
                          title="Rename"
                          onClick={(event) => {
                            event.stopPropagation();
                            beginRename(deal);
                          }}
                        >
                          <Edit3 aria-hidden="true" size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label="Deal actions"
                          title="Actions"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId(menuId === deal.id ? null : deal.id);
                          }}
                        >
                          <MoreHorizontal aria-hidden="true" size={15} />
                        </button>
                        <span title="Open deal"><ExternalLink aria-hidden="true" size={15} /></span>
                      </>
                    )}
                  </div>
                </div>
                {menuId === deal.id && (
                  <div className="deal-square-menu" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => beginRename(deal)}><Edit3 size={14} /> Rename</button>
                    <button type="button" onClick={() => openDeal(deal.id)}><ExternalLink size={14} /> Edit details</button>
                    <button type="button" onClick={() => setError("Duplicate is queued for the next deal template pass.")}><Copy size={14} /> Duplicate</button>
                    <button type="button" onClick={() => setItems((current) => current.filter((item) => item.id !== deal.id))}><Archive size={14} /> Archive</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
