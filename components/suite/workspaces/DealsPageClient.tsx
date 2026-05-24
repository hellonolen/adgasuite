"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, Edit3, ExternalLink, Plus, Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

export interface DealsPageData {
  deals: Array<{
    id: string;
    name: string;
    stage: string;
    updated: string | null;
    nodeCount: number;
    source: "canvas" | "deal";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newDealName, setNewDealName] = useState("Untitled deal");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name} ${item.stage} ${item.id}`.toLowerCase().includes(q));
  }, [items, query]);

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
        const endpoint = item.source === "canvas" ? `/api/maps/${encodeURIComponent(item.id)}` : `/api/deals/${encodeURIComponent(item.id)}`;
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
        const created = await requestJson<{ map?: { id: string }; id?: string }>("/api/maps", {
          method: "POST",
          body: JSON.stringify({ name, template: "blank-deal", deal_id: null }),
        });
        const id = created.map?.id || created.id;
        if (!id) throw new Error("Deal was created without an ID.");
        router.push(`/suite/map/${encodeURIComponent(id)}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create deal.");
      }
    });
  };

  const openDeal = (id: string) => {
    window.location.assign(`/suite/map/${encodeURIComponent(id)}`);
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
            <Sparkles aria-hidden="true" size={16} /> From template
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
            <p>Create the first square, then open it to work the canvas.</p>
            <button className="btn primary" type="button" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" size={16} /> New deal
            </button>
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
                  <span className="deal-square-count">{deal.nodeCount} nodes</span>
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
                  <p>ID {deal.id}</p>
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
                        <span title="Open deal">
                          <ExternalLink aria-hidden="true" size={15} />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
