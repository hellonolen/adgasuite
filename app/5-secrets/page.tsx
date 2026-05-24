"use client";

import { type FormEvent, useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const HOW_IT_WORKS = [
  "A short private guide for high-stakes deal conversations.",
  "Five practical rules for spotting risk before the deal slips.",
  "A simple next-step framework you can use immediately.",
];

const PAIN_POINTS = [
  "You are not sure what the buyer, investor, partner, or client needs next",
  "Important context is scattered across calls, notes, files, and inboxes",
  "Follow-up slows down because the next move is not obvious",
];

export default function DealPipelineAuditPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("submitting");

    const response = await fetch("/api/lead-magnets/five-secrets/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(form.get("email") || ""),
      }),
    }).catch(() => null);

    setStatus(response?.ok ? "sent" : "error");
  }

  return (
    <MarketingLayout>
      <main className="wrap">
        <section className="audit-hero audit-lead-hero">
          <div className="audit-hero-main">
            <div className="audit-hero-copy audit-storybrand-copy">
              <span className="ed-label">Five secrets access</span>
              <h1>Five Secrets to Not Losing Million-Dollar Deals</h1>
              <p>
                Get the private ADGA guide for protecting high-stakes conversations before
                timing, trust, or follow-up costs you the deal.
              </p>
            </div>

            <form className="audit-form audit-hero-form" onSubmit={submit} id="access">
              <span className="ed-label">Get the 5 Secrets</span>
              <label>
                Email
                <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
              </label>
              <button className="btn primary" type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Sending..." : "Get Access"}
              </button>
              {status === "sent" && (
                <p className="audit-status">
                  Check your email for the Five Secrets access link.
                </p>
              )}
              {status === "error" && (
                <p className="audit-status error">Could not submit. Please try again.</p>
              )}
            </form>
          </div>
        </section>

        <section className="audit-problem">
          <div>
            <span className="ed-label">If this sounds familiar</span>
            <h2>You need to know where the deal can break before it breaks.</h2>
          </div>
          <ul>
            {PAIN_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p>
            Then this free guide will help you see the hidden risk before the next conversation.
          </p>
          <a className="btn primary" href="#access">Get Access</a>
        </section>

        <section className="audit-story-plan" aria-label="How it works">
          <div className="audit-section-heading">
            <span className="ed-label">How it works</span>
            <h2>Built for dealmakers who need clarity fast.</h2>
          </div>
          {HOW_IT_WORKS.map((body, index) => (
            <article key={body}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingLayout>
  );
}
