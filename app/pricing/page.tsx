"use client";

import React from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const PRO_MONTHLY = 97;
const TEAM_BASE_MONTHLY = 297;
const TEAM_INCLUDED_SEATS = 5;
const TEAM_SEAT_ADD = 30;
const TEAM_MAX_SEATS = 12;
const ENTERPRISE_BASE_MONTHLY = 597;
const ENTERPRISE_INCLUDED_SEATS = 12;
const ENTERPRISE_SEAT_ADD = 20;
const ANNUAL_MONTHS_BILLED = 10;

const TEAM_SEAT_OPTIONS = [5, 6, 7, 8, 9, 10, 11, 12];
const ENTERPRISE_SEAT_OPTIONS = [12, 15, 20, 25, 30, 50, 75, 100];

type Cadence = "month" | "year";

function format(amount: number) {
  return amount.toLocaleString("en-US");
}

function annualize(monthly: number) {
  return monthly * ANNUAL_MONTHS_BILLED;
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

  const proHref = `/signup?plan=pro&cadence=${cadence}`;
  const teamHref = `/signup?plan=team&seats=${teamSeats}&cadence=${cadence}`;
  const enterpriseHref = `/signup?plan=enterprise&seats=${enterpriseSeats}&cadence=${cadence}`;

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

  return (
    <MarketingLayout>
      <div className="wrap">
        <section style={{ padding: "64px 0 24px", textAlign: "center" }}>
          <span className="ed-label">Pricing</span>
          <div
            role="tablist"
            aria-label="Billing cadence"
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              marginTop: 24,
              border: "1px solid var(--rule)",
              borderRadius: 999,
              background: "var(--surface)",
            }}
          >
            {toggleBtn(!isAnnual, "Monthly", () => setCadence("month"))}
            {toggleBtn(isAnnual, "Annual · 2 months free", () => setCadence("year"))}
          </div>
        </section>

        <section style={{ paddingBottom: 64 }}>
          <div className="pricing" style={{ maxWidth: 1080, marginLeft: "auto", marginRight: "auto" }}>
            <div className="tier">
              <div>
                <div className="name">Pro</div>
                <div className="desc">For the operator running deals on their own.</div>
              </div>
              <div className="price">
                ${format(proShown)}
                <small>{cadenceLabel}</small>
              </div>
              <ul>
                <li>1 user</li>
                <li>Unlimited deals, contacts, documents</li>
                <li>Eight-stage deal process built in</li>
                <li>Voice notes with auto-transcription</li>
                <li>Magic-link sign in</li>
              </ul>
              <a href={proHref} className="btn">Start closing deals</a>
            </div>

            <div className="tier featured">
              <span className="badge">Most popular</span>
              <div>
                <div className="name">Team</div>
                <div className="desc">Built for closing teams working the same deals.</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
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

              <div className="price">
                ${format(teamShown)}
                <small>{cadenceLabel}</small>
              </div>

              <ul>
                <li>Everything in Pro</li>
                <li>{TEAM_INCLUDED_SEATS} seats included, +${TEAM_SEAT_ADD}/seat up to {TEAM_MAX_SEATS}</li>
                <li>Shared deals, calendar, invoicing</li>
                <li>Internal and client communication lanes</li>
                <li>Represented-client portal</li>
              </ul>
              <a href={teamHref} className="btn primary">Start closing deals</a>
            </div>

            <div className="tier">
              <div>
                <div className="name">Enterprise</div>
                <div className="desc">Brokerages, firms, anyone running real deal volume.</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
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

              <div className="price">
                ${format(enterpriseShown)}
                <small>{cadenceLabel}</small>
              </div>

              <ul>
                <li>Everything in Team</li>
                <li>{ENTERPRISE_INCLUDED_SEATS} seats included, +${ENTERPRISE_SEAT_ADD}/seat unlimited</li>
                <li>SSO, audit logs, role permissions</li>
                <li>Branded client portal at your domain</li>
                <li>Dedicated onboarding and priority support</li>
              </ul>
              <a href={enterpriseHref} className="btn">Start closing deals</a>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="faq">
            <div>
              <span className="ed-label">FAQ</span>
              <h2>Plan questions.</h2>
            </div>
            <div className="faq-list">
              <details className="faq-item" open>
                <summary>How is this structured?</summary>
                <p>
                  Pro is one operator. Team includes {TEAM_INCLUDED_SEATS} seats with additional seats at ${TEAM_SEAT_ADD}/mo up to {TEAM_MAX_SEATS} total. Enterprise includes {ENTERPRISE_INCLUDED_SEATS} seats with additional seats at ${ENTERPRISE_SEAT_ADD}/mo, no cap, and adds SSO, audit logs, and a branded client portal.
                </p>
              </details>
              <details className="faq-item">
                <summary>What does annual save?</summary>
                <p>
                  Annual billing is {ANNUAL_MONTHS_BILLED} months at the monthly rate. Two months free, billed yearly.
                </p>
              </details>
              <details className="faq-item">
                <summary>Can I add seats later?</summary>
                <p>
                  Yes. Add seats from workspace settings any time. Billing prorates and the next invoice reflects the new seat count.
                </p>
              </details>
              <details className="faq-item">
                <summary>What happens after checkout?</summary>
                <p>
                  Stripe processes the payment, ADGA provisions the workspace, and the magic-link email lands in your inbox. Click it and you are inside the suite.
                </p>
              </details>
              <details className="faq-item">
                <summary>Can I move between plans?</summary>
                <p>
                  Yes. Upgrade or downgrade without rebuilding records. Deals, contacts, documents, and history carry over.
                </p>
              </details>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
