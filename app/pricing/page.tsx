"use client";

import React from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";
import { MarketingHero } from "@/components/adga/layout/MarketingHero";

const PRO_MONTHLY = 97;
const TEAM_BASE_MONTHLY = 297;
const TEAM_INCLUDED_SEATS = 5;
const TEAM_SEAT_ADD = 30;
const TEAM_MAX_SEATS = 12;
const ENTERPRISE_BASE_MONTHLY = 597;
const ENTERPRISE_INCLUDED_SEATS = 12;
const ENTERPRISE_SEAT_ADD = 20;
const ANNUAL_MONTHS_BILLED = 11;

const TEAM_SEAT_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12];
const ENTERPRISE_SEAT_OPTIONS = [12, 15, 20, 25, 30, 50, 75, 100];

type Cadence = "month" | "year";

function format(amount: number) {
  return amount.toLocaleString("en-US");
}

function annualize(monthly: number) {
  return monthly * ANNUAL_MONTHS_BILLED;
}

const EVERY_PLAN = [
  { label: "Unlimited deals", body: "No record caps, no archive limits." },
  { label: "Unlimited documents", body: "Files, term sheets, voice notes, transcripts." },
  { label: "Unlimited contacts", body: "Every person on every deal, no per-record fees." },
  { label: "Magic-link sign in", body: "No password resets, no SSO setup tax." },
  { label: "Voice notes + transcription", body: "Talk through a deal, get text instantly." },
  { label: "Nine-stage deal process", body: "Lead → Qualify → Discover → Scope → Design → Close → Sign → Deliver → Expand." },
  { label: "Live DealFlow per deal", body: "Every contact, file, call, task on one canvas." },
  { label: "Auto-saved every keystroke", body: "Nothing lost when a tab closes." },
];

const COMPARISON_GROUPS: Array<{ section: string; rows: Array<[string, string | true, string | true, string | true]> }> = [
  {
    section: "Deal execution",
    rows: [
      ["Active deals", "Unlimited", "Unlimited", "Unlimited"],
      ["Contacts and companies", "Unlimited", "Unlimited", "Unlimited"],
      ["Protected file storage", "20 GB", "200 GB", "Custom"],
      ["Nine-stage deal process", true, true, true],
      ["Live DealFlow per deal", true, true, true],
      ["Voice notes with transcription", true, true, true],
      ["Deal templates", "13", "13", "13 + custom"],
    ],
  },
  {
    section: "Team and collaboration",
    rows: [
      ["Seats", "1", `${TEAM_INCLUDED_SEATS}–${TEAM_MAX_SEATS}`, `${ENTERPRISE_INCLUDED_SEATS}+`],
      ["Shared pipeline and calendar", "—", true, true],
      ["Invoicing with payment payouts", "—", true, true],
      ["Approval queue with audit trail", "—", true, true],
      ["Shareable DealFlows for clients", "—", true, true],
      ["Watermarked client shares", "—", "—", true],
    ],
  },
  {
    section: "Intelligence and automation",
    rows: [
      ["In-workspace deal copilot", true, true, true],
      ["Domain workflows across the deal lifecycle", true, true, true],
      ["Forecast and weighted pipeline", true, true, true],
      ["Approval-gated actions", true, true, true],
      ["Custom workflow configuration", "—", "—", true],
    ],
  },
  {
    section: "Security and compliance",
    rows: [
      ["Magic-link sign in", true, true, true],
      ["Encrypted workspace storage", true, true, true],
      ["Role-based permissions", "—", true, true],
      ["Immutable audit logs", "—", "—", true],
      ["Revocable client access", "—", true, true],
      ["Dedicated onboarding", "—", "—", true],
      ["Priority support", "—", "Standard", "Priority"],
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "How is this structured?",
    a: `Pro is for the closer running their own book. Team includes ${TEAM_INCLUDED_SEATS} seats with additional seats at $${TEAM_SEAT_ADD}/mo up to ${TEAM_MAX_SEATS} total. Enterprise includes ${ENTERPRISE_INCLUDED_SEATS} seats with additional seats at $${ENTERPRISE_SEAT_ADD}/mo, no cap, and adds role permissions, immutable audit logs, and watermarked client shares.`,
  },
  {
    q: "What does annual save?",
    a: `Annual billing is ${ANNUAL_MONTHS_BILLED} months at the monthly rate. One month free, billed yearly.`,
  },
  {
    q: "Can I add seats later?",
    a: "Yes. Add seats from workspace settings any time. Billing prorates and the next invoice reflects the new seat count.",
  },
  {
    q: "What happens after checkout?",
    a: "Checkout processes the payment, ADGA provisions the workspace, and opens onboarding. A sign-in link is still available for returning to the suite later.",
  },
  {
    q: "Can I move between plans?",
    a: "Yes. Upgrade or downgrade without rebuilding records. Deals, contacts, documents, and history carry over.",
  },
  {
    q: "Is my data secure?",
    a: "Workspace records, documents, and voice notes are encrypted in transit and at rest. Your workspace is isolated from other customers.",
  },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5d2cd6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7"/>
    </svg>
  );
}

function Dash() {
  return <span style={{ color: "var(--adga-text-2, #6b6760)", fontSize: 14 }}>—</span>;
}

export default function PricingPage() {
  const [cadence, setCadence] = React.useState<Cadence>("month");
  const [teamSeats, setTeamSeats] = React.useState(TEAM_INCLUDED_SEATS);
  const [enterpriseSeats, setEnterpriseSeats] = React.useState(ENTERPRISE_INCLUDED_SEATS);

  const isAnnual = cadence === "year";
  const cadenceLabel = isAnnual ? "per year" : "per month";

  const proMonthly = PRO_MONTHLY;
  const teamMonthly =
    TEAM_BASE_MONTHLY +
    Math.max(0, teamSeats - TEAM_INCLUDED_SEATS) * TEAM_SEAT_ADD;
  const enterpriseMonthly =
    ENTERPRISE_BASE_MONTHLY +
    Math.max(0, enterpriseSeats - ENTERPRISE_INCLUDED_SEATS) * ENTERPRISE_SEAT_ADD;

  const proShown = isAnnual ? annualize(proMonthly) : proMonthly;
  const teamShown = isAnnual ? annualize(teamMonthly) : teamMonthly;
  const enterpriseShown = isAnnual ? annualize(enterpriseMonthly) : enterpriseMonthly;

  const proHref = `/checkout?plan=pro&cadence=${cadence}`;
  const teamHref = `/checkout?plan=team&seats=${teamSeats}&cadence=${cadence}`;
  const enterpriseHref = `/checkout?plan=enterprise&seats=${enterpriseSeats}&cadence=${cadence}`;

  const toggleBtn = (active: boolean, label: React.ReactNode, onClick: () => void) => (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      type="button"
      style={{
        padding: "10px 22px",
        borderRadius: 999,
        border: 0,
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--adga-text)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );

  const renderCell = (v: string | true) =>
    v === true ? <Check /> : typeof v === "string" && v === "—" ? <Dash /> : <span style={{ fontSize: 14, color: "var(--adga-text, #0d0c0a)" }}>{v}</span>;

  return (
    <MarketingLayout>
      <div className="wrap">
        {/* HERO */}
        <MarketingHero
          variant="compact"
          headline="Join our community."
          deck="You, a team, or enterprise can close more deals."
        />

        {/* CADENCE SWITCHER — its own section so it has real breathing room above and below. */}
        <section style={{ padding: "20px 0 44px", textAlign: "center" }}>
          <div
            role="tablist"
            aria-label="Billing cadence"
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              border: "1px solid var(--rule)",
              borderRadius: 999,
              background: "var(--surface)",
            }}
          >
            {toggleBtn(!isAnnual, "Monthly", () => setCadence("month"))}
            {toggleBtn(isAnnual, "Annual · 1 month free", () => setCadence("year"))}
          </div>
        </section>

        {/* PLAN CARDS */}
        <section style={{ paddingBottom: 48 }}>
          <div className="pricing" style={{ maxWidth: 1120, marginLeft: "auto", marginRight: "auto" }}>
            <div className="tier">
              <div>
                <div className="name">Pro</div>
                <div className="desc">For the closer running their own book of deals.</div>
              </div>
              <div className="price">
                ${format(proShown)}
                <small>{cadenceLabel}</small>
              </div>
              <ul>
                <li>1 user · everything in every plan</li>
                <li>20 GB document storage</li>
                <li>Voice notes with auto-transcription</li>
                <li>In-workspace deal copilot</li>
                <li>Live DealFlow per deal</li>
              </ul>
              <a href={proHref} className="btn">Start closing deals</a>
            </div>

            <div className="tier featured">
              <span className="badge">Most popular</span>
              <div>
                <div className="name">Team</div>
                <div className="desc">For closers, dealmakers, and operators working the same deals together.</div>
              </div>

              <div className="price">
                ${format(teamShown)}
                <small>{cadenceLabel}</small>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: -8, marginBottom: 4 }}>
                <label
                  htmlFor="team-seats"
                  style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--adga-text-2)" }}
                >
                  Seats
                </label>
                <select
                  id="team-seats"
                  value={teamSeats}
                  onChange={(event) => setTeamSeats(Number(event.target.value))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--rule)",
                    background: "var(--surface)",
                    fontSize: 14,
                    minWidth: 96,
                  }}
                >
                  {TEAM_SEAT_OPTIONS.map((seats) => (
                    <option key={seats} value={seats}>
                      {seats} seats
                    </option>
                  ))}
                </select>
              </div>

              <ul>
                <li>{TEAM_INCLUDED_SEATS} seats included, +${TEAM_SEAT_ADD}/seat up to {TEAM_MAX_SEATS}</li>
                <li>200 GB document storage</li>
                <li>Shared deals, calendar, invoicing</li>
                <li>Approval queue with audit trail</li>
                <li>Shareable DealFlows for clients</li>
              </ul>
              <a href={teamHref} className="btn primary">Start closing deals</a>
            </div>

            <div className="tier">
              <div>
                <div className="name">Enterprise</div>
                <div className="desc">For closers running real deal volume across multiple offices.</div>
              </div>

              <div className="price">
                ${format(enterpriseShown)}
                <small>{cadenceLabel}</small>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: -8, marginBottom: 4 }}>
                <label
                  htmlFor="enterprise-seats"
                  style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--adga-text-2)" }}
                >
                  Seats
                </label>
                <select
                  id="enterprise-seats"
                  value={enterpriseSeats}
                  onChange={(event) => setEnterpriseSeats(Number(event.target.value))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--rule)",
                    background: "var(--surface)",
                    fontSize: 14,
                    minWidth: 96,
                  }}
                >
                  {ENTERPRISE_SEAT_OPTIONS.map((seats) => (
                    <option key={seats} value={seats}>
                      {seats} seats
                    </option>
                  ))}
                </select>
              </div>

              <ul>
                <li>Starts at {ENTERPRISE_INCLUDED_SEATS} seats · add seats at ${ENTERPRISE_SEAT_ADD} each</li>
                <li>Custom document storage</li>
                <li>Role-based permissions + immutable audit logs</li>
                <li>Watermarked client shares with revocable access</li>
                <li>Dedicated onboarding and priority support</li>
              </ul>
              <a href={enterpriseHref} className="btn">Start closing deals</a>
            </div>
          </div>
        </section>

        {/* EVERY PLAN — trust strip */}
        <section className="section" style={{ paddingTop: 56 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span className="ed-label">In every plan</span>
            <h2 className="title" style={{ marginTop: 10 }}>Everything you need to close, in every plan.</h2>
            <p style={{ maxWidth: "60ch", margin: "12px auto 0", color: "var(--adga-text-2)" }}>
              No "starter" gotchas. The features below ship on Pro, Team, and Enterprise.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 18,
              maxWidth: 1080,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {EVERY_PLAN.map((item) => (
              <div
                key={item.label}
                style={{
                  padding: 20,
                  borderRadius: 14,
                  border: "1px solid var(--rule, #e8e4de)",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Check />
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--adga-text, #0d0c0a)" }}>{item.label}</div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--adga-text-2, #6b6760)", margin: 0 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="section" style={{ paddingTop: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span className="ed-label">Compare plans</span>
            <h2 className="title" style={{ marginTop: 10 }}>Pick your deal flow configuration.</h2>
          </div>
          <div style={{ maxWidth: 1120, marginLeft: "auto", marginRight: "auto", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 760,
                borderCollapse: "separate",
                borderSpacing: 0,
                background: "#fff",
                border: "1px solid var(--rule, #e8e4de)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface, #f1ede8)" }}>
                  <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--adga-text-2, #6b6760)" }}>Feature</th>
                  <th style={{ textAlign: "center", padding: "16px 20px", fontSize: 13, fontWeight: 600 }}>Pro</th>
                  <th style={{ textAlign: "center", padding: "16px 20px", fontSize: 13, fontWeight: 600, background: "rgba(86, 36, 199, 0.05)" }}>Team</th>
                  <th style={{ textAlign: "center", padding: "16px 20px", fontSize: 13, fontWeight: 600 }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_GROUPS.map((group) => (
                  <React.Fragment key={group.section}>
                    <tr>
                      <td colSpan={4} style={{ padding: "20px 20px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--adga-accent, #5d2cd6)", borderTop: "1px solid var(--rule, #e8e4de)" }}>
                        {group.section}
                      </td>
                    </tr>
                    {group.rows.map(([label, pro, team, ent], idx) => (
                      <tr key={`${group.section}-${idx}`} style={{ borderTop: "1px solid var(--rule, #e8e4de)" }}>
                        <td style={{ padding: "14px 20px", fontSize: 14, color: "var(--adga-text, #0d0c0a)" }}>{label}</td>
                        <td style={{ padding: "14px 20px", textAlign: "center" }}>{renderCell(pro)}</td>
                        <td style={{ padding: "14px 20px", textAlign: "center", background: "rgba(86, 36, 199, 0.04)" }}>{renderCell(team)}</td>
                        <td style={{ padding: "14px 20px", textAlign: "center" }}>{renderCell(ent)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="section" style={{ paddingTop: 80 }}>
          <div
            style={{
              maxWidth: 1080,
              margin: "0 auto",
              padding: "36px 32px",
              borderRadius: 18,
              background: "linear-gradient(180deg, rgba(86, 36, 199, 0.03), rgba(86, 36, 199, 0.07))",
              border: "1px solid rgba(86, 36, 199, 0.12)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
            }}
          >
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--adga-accent, #5d2cd6)", marginBottom: 6 }}>Secure workspace</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--adga-text-2)" }}>Your records, documents, voice notes, and invoices stay encrypted and tied to the deal.</p>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--adga-accent, #5d2cd6)", marginBottom: 6 }}>Approval-gated AI</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--adga-text-2)" }}>Every customer-facing action waits for your sign-off. You keep the wheel.</p>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--adga-accent, #5d2cd6)", marginBottom: 6 }}>Immutable audit log</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--adga-text-2)" }}>Every state change recorded forward-only. Compliance-ready out of the box.</p>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--adga-accent, #5d2cd6)", marginBottom: 6 }}>Migrate in a day</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--adga-text-2)" }}>Import CSV, another CRM, email threads, calendar history, or a folder.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" style={{ paddingTop: 80 }}>
          <div className="faq">
            <div>
              <span className="ed-label">FAQ</span>
              <h2>Plan questions.</h2>
            </div>
            <div className="faq-list">
              {FAQ_ITEMS.map((item, i) => (
                <details key={item.q} className="faq-item" open={i === 0}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section" style={{ paddingTop: 64, paddingBottom: 96, textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 44px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 auto 12px", maxWidth: "20ch" }}>
            Ready to close more deals?
          </h2>
          <p style={{ fontSize: 16, color: "var(--adga-text-2)", maxWidth: "50ch", margin: "0 auto 24px" }}>
            Start with the plan that fits today. Move up when the team grows. Move down if you change your mind. No record loss.
          </p>
          <a href={proHref} className="btn primary lg">Start closing deals</a>
        </section>
      </div>
    </MarketingLayout>
  );
}
