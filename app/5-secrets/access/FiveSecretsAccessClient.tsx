"use client";

import { useEffect, useRef, useState } from "react";

const SECRETS = [
  {
    short: "The Real Problem",
    title: "Confirm the real problem before you present the solution",
    paragraphs: [
      "Million-dollar deals are lost when the seller moves faster than the buyer's real concern. The bigger the deal, the more expensive a wrong assumption becomes.",
      "Before you present a solution, slow down long enough to confirm the problem in the buyer's words. If the buyer cannot describe the issue clearly, they will not defend your offer when other stakeholders question it.",
      "A weak problem statement makes every later step harder: pricing feels high, timelines feel rushed, and proof feels disconnected. A clear problem gives the deal a reason to move.",
      "Your job is not just to understand what they want. Your job is to understand what happens if they do nothing.",
    ],
    action: "Ask: What happens if this does not get solved in the next 90 days?",
    checks: ["Repeat the problem in their words.", "Confirm why it matters now.", "Tie urgency to a real business consequence."],
  },
  {
    short: "The Decision Path",
    title: "Map the decision path, not just the decision-maker",
    paragraphs: [
      "One champion is not the same as a closed deal. A champion can like you, believe in the offer, and still be unable to move the deal alone.",
      "High-stakes decisions usually pass through finance, legal, operations, leadership, procurement, or an outside advisor. Each group can introduce risk, delay, or quiet resistance.",
      "If you only know the person you are speaking with, you do not know the deal. You need to know who can approve, who can delay, who needs proof, and who can quietly kill momentum.",
      "The decision path turns an exciting conversation into a real process. Without it, you are guessing at the close.",
    ],
    action: "Ask: Who else needs to be comfortable before this can move forward?",
    checks: ["Name the economic buyer.", "Identify legal, finance, and operational blockers.", "Know who can say no without joining the call."],
  },
  {
    short: "The Next Move",
    title: "Never leave the next move implied",
    paragraphs: [
      "Momentum stalls when the next step lives in somebody's memory. In a large deal, vague follow-up creates space for doubt, delay, and competing priorities.",
      "Every serious conversation should end with one clear next move. That move needs an owner, a due date, and a reason it matters to the deal.",
      "Do not settle for phrases like \"we will circle back\" or \"let's stay in touch.\" Those are not next steps. They are placeholders.",
      "A strong next move gives everyone something to organize around. It makes the deal easier to inspect, easier to support, and harder to lose quietly.",
    ],
    action: "Say: The next step is X, owned by Y, by Z date. Is that right?",
    checks: ["State the owner.", "Attach a due date.", "Make the business reason explicit."],
  },
  {
    short: "The Proof Gap",
    title: "Attach proof before doubt appears",
    paragraphs: [
      "Trust is built before the objection is spoken. In a million-dollar deal, the people who feel the most risk are often not in the room when the offer is explained.",
      "Proof gives your champion something to carry back to the rest of the organization. It can be a case, a reference, a financial model, a document, a call summary, or a clear record of what was agreed.",
      "If proof is missing, the buyer has to do the work of explaining why the deal is safe. That is a dangerous place to put them.",
      "Attach proof early. Make the deal easier to believe before skepticism has time to shape the room.",
    ],
    action: "Ask: What would make this feel safer for the people who are not in this room?",
    checks: ["Attach proof before the objection.", "Document commitments.", "Give absent stakeholders something concrete to trust."],
  },
  {
    short: "The Close Path",
    title: "Remove friction from the close path",
    paragraphs: [
      "A deal is not closed because everyone feels good. It is closed when the path is clean.",
      "Terms, signature, invoice, payment, onboarding, and handoff all create friction if they appear too late. The close can stall after verbal agreement if the operational path is unclear.",
      "Do not wait until the buyer says yes to ask how the agreement gets signed, who receives the invoice, or what has to happen internally. Those details are part of the deal.",
      "The cleanest closes are prepared before the final conversation. Everyone knows what happens next, who owns it, and what could slow it down.",
    ],
    action: "Ask: If we decide to move forward, what has to happen operationally?",
    checks: ["Clarify signature steps.", "Know invoice and payment timing.", "Make handoff ownership visible."],
  },
];

export function FiveSecretsAccessClient() {
  const [active, setActive] = useState(0);
  const trackedDepths = useRef(new Set<number>());
  const sessionIdRef = useRef("");
  const secret = SECRETS[active];

  function sessionId() {
    if (sessionIdRef.current) return sessionIdRef.current;
    const fallback = `five_secrets_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const existing = window.sessionStorage.getItem("five_secrets_session");
      const next = existing || fallback;
      window.sessionStorage.setItem("five_secrets_session", next);
      sessionIdRef.current = next;
      return next;
    } catch {
      sessionIdRef.current = fallback;
      return fallback;
    }
  }

  function track(event_type: string, payload: Record<string, unknown> = {}) {
    fetch("/api/lead-magnets/five-secrets/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type,
        session_id: sessionId(),
        source_path: "/5-secrets/access",
        payload,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    track("lead_magnet.five_secrets.access_viewed");

    function onScroll() {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const depth = Math.round((window.scrollY / scrollable) * 100);
      for (const marker of [25, 50, 75, 90]) {
        if (depth >= marker && !trackedDepths.current.has(marker)) {
          trackedDepths.current.add(marker);
          track("lead_magnet.five_secrets.scroll_depth", { depth: marker });
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    track("lead_magnet.five_secrets.secret_viewed", {
      secret_index: active + 1,
      secret_title: secret.short,
    });
  }, [active, secret.short]);

  return (
    <main className="wrap">
      <section className="secrets-access">
          <aside className="secrets-access-sidebar" aria-label="Five Secrets navigation">
            <div className="secrets-sidebar-head">
              <span className="secrets-eyebrow">Five Secrets</span>
              <h1>Five Secrets to Not Losing Million-Dollar Deals</h1>
              <p>Five checks before the next high-stakes conversation.</p>
            </div>
            <nav>
              {SECRETS.map((item, index) => (
                <button
                  className={index === active ? "active" : ""}
                  key={item.title}
                  onClick={() => setActive(index)}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item.short}</b>
                </button>
              ))}
            </nav>
          </aside>

          <article className="secrets-access-panel">
            <div className="secrets-panel-top">
              <div>
                <span className="secrets-kicker">Secret {active + 1}</span>
                <h2>{secret.short}</h2>
              </div>
              <span className="secrets-count">{active + 1} / {SECRETS.length}</span>
            </div>
            <div className="secrets-panel-copy">
              <section className="secrets-principle">
                <span>Principle</span>
                <h3>{secret.title}</h3>
                {secret.paragraphs.map((paragraph, index) => (
                  <p className={index === 0 ? "secrets-lead" : ""} key={paragraph}>
                    {index > 0 && <em>{String(index).padStart(2, "0")}</em>}
                    {paragraph}
                  </p>
                ))}
              </section>
              <aside className="secrets-prompt">
                <span>Prompt</span>
                <p>{secret.action}</p>
              </aside>
              <section className="secrets-checks">
                <span>Before the next call</span>
                <ul>
                  {secret.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </section>
            </div>
            <div className="secrets-panel-controls">
              <button className="btn" type="button" onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}>
                Previous
              </button>
              <button className="btn primary" type="button" onClick={() => setActive(Math.min(SECRETS.length - 1, active + 1))} disabled={active === SECRETS.length - 1}>
                Next secret
              </button>
            </div>
          </article>
      </section>
    </main>
  );
}
