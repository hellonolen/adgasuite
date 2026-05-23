"use client";

import { useState } from "react";

interface Defaults {
  name: string;
  domain: string;
  plan: string;
  defaultDealType: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  timezone: string;
}

const PLAN_OPTIONS = [
  { value: "suite", label: "Suite" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

const DEAL_TYPES = [
  { value: "advisory", label: "Advisory" },
  { value: "capital_raise", label: "Capital raise" },
  { value: "m_and_a", label: "M&A" },
  { value: "secondary", label: "Secondary" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
];

type Status = "idle" | "saving" | "saved" | "error";

export function WorkspaceSettingsForm({ defaults }: { defaults: Defaults }) {
  const [values, setValues] = useState<Defaults>(defaults);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  function update<K extends keyof Defaults>(key: K, value: Defaults[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Could not save workspace settings.");
        return;
      }
      setStatus("saved");
      setMessage("Workspace settings saved.");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <Section title="Identity" description="How this workspace appears across the suite.">
        <Field id="ws-name" label="Workspace name">
          <input
            id="ws-name"
            type="text"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
          />
        </Field>
        <Field id="ws-domain" label="Primary domain">
          <input
            id="ws-domain"
            type="text"
            value={values.domain}
            onChange={(event) => update("domain", event.target.value)}
            placeholder="acme.adga.app"
            className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
          />
        </Field>
      </Section>

      <Section title="Defaults" description="Applied to new deals when no override is set.">
        <Field id="ws-plan" label="Default plan">
          <select
            id="ws-plan"
            value={values.plan}
            onChange={(event) => update("plan", event.target.value)}
            className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ws-deal-type" label="Default deal type">
          <select
            id="ws-deal-type"
            value={values.defaultDealType}
            onChange={(event) => update("defaultDealType", event.target.value)}
            className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
          >
            {DEAL_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Operating hours" description="Used for SLA and follow-up scheduling.">
        <div className="grid grid-cols-2 gap-4 sm:col-span-2">
          <Field id="ws-hours-start" label="Business hours start">
            <input
              id="ws-hours-start"
              type="time"
              value={values.businessHoursStart}
              onChange={(event) => update("businessHoursStart", event.target.value)}
              className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
            />
          </Field>
          <Field id="ws-hours-end" label="Business hours end">
            <input
              id="ws-hours-end"
              type="time"
              value={values.businessHoursEnd}
              onChange={(event) => update("businessHoursEnd", event.target.value)}
              className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
            />
          </Field>
        </div>
        <Field id="ws-timezone" label="Time zone">
          <select
            id="ws-timezone"
            value={values.timezone}
            onChange={(event) => update("timezone", event.target.value)}
            className="w-full rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--rule,#e8e4de)] bg-white px-5 py-4">
        <div className="text-sm">
          {message ? (
            <span
              className={status === "error" ? "text-red-700" : "text-emerald-700"}
            >
              {message}
            </span>
          ) : (
            <span className="text-[#6b6760]">Changes apply to everyone in the workspace.</span>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "saving"}
          className="inline-flex items-center justify-center rounded-md bg-[#5d2cd6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4a23ac] disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--rule,#e8e4de)] bg-white">
      <header className="border-b border-[var(--rule,#e8e4de)] px-5 py-4">
        <div className="text-base font-semibold text-[#0d0c0a]">{title}</div>
        <p className="mt-0.5 text-xs text-[#6b6760]">{description}</p>
      </header>
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6760]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
