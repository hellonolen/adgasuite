"use client";

import React, { useEffect, useRef, useState } from "react";
import { MarketingLayout } from "@/components/adga/layout/MarketingLayout";

const needs = [
  "Payroll",
  "Payroll tax filing",
  "Hiring and onboarding",
  "Time and attendance",
  "Benefits administration",
  "Workers' compensation",
  "Retirement plan support",
  "HR compliance",
];

const companySizes = ["1-9", "10-24", "25-49", "50-99", "100-249", "250+"];
const timingOptions = ["Immediately", "This month", "This quarter", "Exploring options"];
const adpAffiliateCode = "PW56143";
const adpReferralLink = "https://info.adp.com/referral-hub?loid=&adp_pc=PW56143";

export default function AdpPartnerPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const sessionIdRef = useRef("");
  const engagedRef = useRef(false);
  const submittedRef = useRef(false);

  function getSessionId() {
    if (sessionIdRef.current) return sessionIdRef.current;

    const fallback = `adp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      const existing = window.sessionStorage.getItem("adp_funnel_session");
      const next = existing || fallback;
      window.sessionStorage.setItem("adp_funnel_session", next);
      sessionIdRef.current = next;
      return next;
    } catch {
      sessionIdRef.current = fallback;
      return fallback;
    }
  }

  function filledFields(form: HTMLFormElement) {
    const data = new FormData(form);
    return Array.from(new Set(Array.from(data.entries())
      .filter(([, value]) => String(value || "").trim())
      .map(([key]) => key)));
  }

  function trackFunnelEvent(eventType: string, payload: Record<string, unknown> = {}, leadId?: string) {
    const body = {
      event_type: eventType,
      lead_id: leadId || null,
      session_id: getSessionId(),
      affiliate_code: adpAffiliateCode,
      affiliate_url: adpReferralLink,
      source_path: "/adp",
      payload,
    };

    fetch("/api/partners/adp/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }

  function trackFormEngagement(event: React.FormEvent<HTMLFormElement>) {
    if (engagedRef.current) return;
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    engagedRef.current = true;
    trackFunnelEvent("partner_referral.form_engaged", {
      first_field: target?.name || null,
    });
  }

  useEffect(() => {
    getSessionId();
    trackFunnelEvent("partner_referral.form_landed");

    function onPageHide() {
      if (submittedRef.current) return;
      const form = document.querySelector<HTMLFormElement>("form.adp-lead-form");
      if (!form) return;
      const fields = filledFields(form);
      if (!fields.length) return;

      const body = {
        event_type: "partner_referral.form_abandoned",
        lead_id: null,
        session_id: getSessionId(),
        affiliate_code: adpAffiliateCode,
        affiliate_url: adpReferralLink,
        source_path: "/adp",
        payload: {
          filled_field_count: fields.length,
          filled_fields: fields,
        },
      };
      const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
      navigator.sendBeacon?.("/api/partners/adp/events", blob);
    }

    window.addEventListener("pagehide", onPageHide);
    fetch(adpReferralLink, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
      cache: "no-store",
    }).catch(() => {});

    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const fields = filledFields(formElement);
    const form = new FormData(formElement);
    setStatus("sending");
    setMessage("");
    trackFunnelEvent("partner_referral.submit_clicked", {
      filled_field_count: fields.length,
      filled_fields: fields,
    });

    try {
      const response = await fetch("/api/partners/adp/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          phone: form.get("phone"),
          company: form.get("company"),
          job_title: form.get("job_title"),
          company_size: form.get("company_size"),
          state: form.get("state"),
          payroll_timing: form.get("payroll_timing"),
          current_payroll_provider: form.get("current_payroll_provider"),
          needs: form.getAll("needs"),
          notes: form.get("notes"),
          consent_to_contact: form.get("consent_to_contact") === "on",
          source_path: "/adp",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.ok) {
        setStatus("sent");
        submittedRef.current = true;
        const leadId = payload.lead?.id ? String(payload.lead.id) : "";
        trackFunnelEvent("partner_referral.submit_succeeded", {
          filled_field_count: fields.length,
          filled_fields: fields,
          email_sent: Boolean(payload.email?.sent),
        }, leadId);
        const params = new URLSearchParams({ partner: adpAffiliateCode });
        if (leadId) params.set("lead", leadId);
        window.location.href = `/adp/thank-you?${params.toString()}`;
      } else {
        trackFunnelEvent("partner_referral.submit_failed", {
          filled_field_count: fields.length,
          filled_fields: fields,
          status: response.status,
          error: payload.error || "Unknown ADP lead submission error.",
        });
        setStatus("error");
        setMessage(payload.error || "The lead could not be submitted. Please try again.");
      }
    } catch (error) {
      trackFunnelEvent("partner_referral.submit_failed", {
        filled_field_count: fields.length,
        filled_fields: fields,
        error: String(error),
      });
      setStatus("error");
      setMessage("The lead could not be submitted. Please try again.");
    }
  }

  return (
    <MarketingLayout>
      <div className="wrap adp-page" data-adp-affiliate-code={adpAffiliateCode} data-adp-affiliate-url={adpReferralLink}>
        <section className="adp-conversion-hero" aria-labelledby="adp-page-title">
          <div className="adp-offer-panel">
            <div className="adp-badge-row">
              <span>Payroll support</span>
              <span>HR options</span>
              <span>ADP partner code {adpAffiliateCode}</span>
            </div>
            <h1 id="adp-page-title">
              Payroll help for growing teams.
            </h1>
            <p>
              Tell us what you need and we will connect you with the right payroll support for your company.
            </p>
            <div className="adp-proof-grid" aria-label="Offer highlights">
              <div>
                <strong>Up to 6 months</strong>
                <span>Free payroll may be available for eligible companies</span>
              </div>
              <div>
                <strong>Payroll</strong>
                <span>Processing, tax filing, and support</span>
              </div>
              <div>
                <strong>HR</strong>
                <span>Hiring, onboarding, and compliance options</span>
              </div>
            </div>
            <div className="adp-contact-card">
              <span>ADP partner referral</span>
              <strong>Small-business payroll and HR</strong>
              <p>Companies that need cleaner payroll, tax, hiring, or employee administration support.</p>
            </div>
          </div>

          <form className="adp-lead-form partner-form premium-form" onInput={trackFormEngagement} onChange={trackFormEngagement} onSubmit={submit}>
            <div className="adp-form-head">
              <span>Payroll inquiry</span>
              <h2>Request payroll</h2>
              <p>Share a few details and a payroll specialist will follow up with options that fit your company.</p>
            </div>
            <div className="adp-form-grid">
              <div className="field"><label>Full name</label><input name="full_name" required /></div>
              <div className="field"><label>Email</label><input name="email" type="email" required /></div>
              <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
              <div className="field"><label>Company</label><input name="company" /></div>
              <div className="field"><label>Role</label><input name="job_title" /></div>
              <div className="field">
                <label>Company size</label>
                <select name="company_size">
                  <option value="">Select size</option>
                  {companySizes.map((size) => <option value={size} key={size}>{size}</option>)}
                </select>
              </div>
              <div className="field"><label>State</label><input name="state" placeholder="State" /></div>
              <div className="field">
                <label>Payroll timing</label>
                <select name="payroll_timing">
                  <option value="">Select timing</option>
                  {timingOptions.map((timing) => <option value={timing} key={timing}>{timing}</option>)}
                </select>
              </div>
              <div className="field adp-wide"><label>Current payroll provider</label><input name="current_payroll_provider" placeholder="ADP, Gusto, Paychex, QuickBooks, none..." /></div>
            </div>

            <fieldset className="field adp-wide">
              <label>Payroll needs</label>
              <div className="adp-check-grid">
                {needs.map((need) => (
                  <label key={need}>
                    <input type="checkbox" name="needs" value={need} />
                    <span>{need}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label>Notes</label>
              <textarea name="notes" rows={3} placeholder="Anything the payroll specialist should know..." />
            </div>

            <label className="adp-consent">
              <input name="consent_to_contact" type="checkbox" required />
              <span>I agree that ADGA may share this information with a payroll specialist so they can follow up about payroll or HR services.</span>
            </label>

            <div className="adp-form-footer">
              <button className="btn primary lg" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending..." : "Request payroll"}
              </button>
              {message && <p className={`status-msg ${status}`}>{message}</p>}
            </div>
          </form>
        </section>

        <section className="adp-detail-strip" aria-label="ADP offer details">
          <article>
            <span>Payroll support</span>
            <p>Get help with payroll processing, payroll taxes, employee records, pay schedules, and the administrative pieces that slow teams down.</p>
          </article>
          <article>
            <span>HR options</span>
            <p>Ask about hiring, onboarding, time tracking, benefits administration, workers' compensation, and compliance support.</p>
          </article>
          <article>
            <span>Next step</span>
            <p>Submit the form and a specialist will review your company size, current provider, timing, and payroll needs before reaching out.</p>
          </article>
        </section>

        <section className="adp-expanded-panel">
          <div className="adp-expanded-copy">
            <span>Payroll and HR support</span>
            <h2>Bring payroll, tax, hiring, and employee administration into a cleaner conversation.</h2>
            <p>
              Payroll is recurring operational work that has to be correct every pay period. This inquiry helps a payroll specialist understand your company size, current provider, timing, payroll needs, and HR priorities before the first call.
            </p>
          </div>
          <div className="adp-coverage-grid" aria-label="Payroll support coverage">
            <div><strong>Payroll processing</strong><span>Pay schedules, employee records, direct deposit, and day-to-day payroll administration.</span></div>
            <div><strong>Payroll tax support</strong><span>Federal, state, and local payroll tax filing needs that come with running payroll.</span></div>
            <div><strong>Hiring and onboarding</strong><span>Employee setup, new-hire paperwork, onboarding workflows, and HR administration.</span></div>
            <div><strong>Benefits and compliance</strong><span>Benefits administration, workers' compensation, time tracking, and HR compliance questions.</span></div>
          </div>
        </section>

        <section className="adp-audience-panel">
          <div className="adp-audience-card">
            <span>Switching providers</span>
            <h3>When the current payroll setup is not working.</h3>
            <p>Share what is broken, what has to change, employee count, current provider, and how quickly the company needs a better process.</p>
          </div>
          <div className="adp-audience-card">
            <span>Setting up payroll</span>
            <h3>When the company needs payroll stood up cleanly.</h3>
            <p>Bring company size, state, hiring plans, pay frequency, employee structure, and the payroll timeline into one intake.</p>
          </div>
          <div className="adp-audience-card">
            <span>Adding HR support</span>
            <h3>When payroll needs more than pay runs.</h3>
            <p>Ask about onboarding, time tracking, benefits administration, workers' compensation, employee records, and compliance support.</p>
          </div>
        </section>

        <section className="adp-eligibility-panel">
          <div>
            <span>Offer eligibility</span>
            <h2>Eligible companies may qualify for up to six months free payroll.</h2>
          </div>
          <ul>
            <li>Companies switching from another payroll provider may qualify with 3-49 employees.</li>
            <li>Companies not switching from another payroll provider may qualify with 5-49 employees.</li>
            <li>Eligibility depends on ADP program terms, payroll setup, processing requirements, and service fit.</li>
            <li>A payroll specialist can confirm what applies after reviewing the company details.</li>
          </ul>
        </section>

        <section className="adp-process-row" aria-label="Payroll inquiry process">
          <div>
            <span>01</span>
            <strong>Submit the inquiry</strong>
            <p>Use the form to share company, timing, current provider, and payroll or HR needs.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Review fit</strong>
            <p>A payroll specialist reviews eligibility, service needs, payroll timing, and the best next step.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Move payroll forward</strong>
            <p>If there is a fit, the specialist can walk through setup, migration, or a cleaner payroll process.</p>
          </div>
        </section>

        <section className="adp-compliance-note" aria-label="Program terms">
          <p>
            Eligibility and service terms apply. ADP, the ADP logo, RUN Powered by ADP, and Always Designing for People are trademarks of ADP, Inc.
          </p>
          <div className="adp-affiliate-credit">
            <strong>ADP affiliate code</strong>
            <span>{adpAffiliateCode}</span>
          </div>
          <div className="adp-terms-grid">
            <div>
              <strong>Payroll offer terms</strong>
              <p>
                To receive six non-consecutive free months of payroll with RUN Powered by ADP® (RUN), referred company must sign and submit an ADP sales order and start processing payroll by 6/25/2026. The company must continue processing for three consecutive months at the originally implemented bundle, payroll frequency, and discounting level. Eligible companies must use Direct Debit of Fees, switch from another payroll provider and have 3-49 employees, or have 5-49 employees if not switching from another payroll provider. See website for complete terms and conditions.
              </p>
            </div>
            <div>
              <strong>Clover offer terms</strong>
              <p>
                Clover offer is for qualified merchants on eligible products. Terms and conditions apply. To participate in the Accountant Revenue Share program, accountants must agree to applicable program terms. Applicable terms and conditions apply to each offering and may require the acceptance of additional terms. View complete program terms at adpaccountantrevenueshare.com.
              </p>
            </div>
            <div>
              <strong>Trademark notice</strong>
              <p>
                ADP, the ADP logo, RUN Powered by ADP and Always Designing for People are trademarks of ADP, Inc. The Clover name and logo are registered trademarks owned by Clover Network, LLC. All trademarks, service marks, and trade names referenced in this material are the property of their respective owners. Copyright © 2026 ADP, Inc. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
