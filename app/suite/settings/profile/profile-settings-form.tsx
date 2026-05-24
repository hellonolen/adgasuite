"use client";

import { useState } from "react";
import { PanelSaveBar, useSavePanel } from "@/components/suite/SettingsLayout";

type ProfileDefaults = {
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  timezone: string;
  signature: string;
};

export default function ProfileSettingsForm({ defaults }: { defaults: ProfileDefaults }) {
  const [values, setValues] = useState({
    first_name: defaults.firstName,
    last_name: defaults.lastName,
    email: defaults.email,
    title: defaults.title,
    phone: defaults.phone,
    timezone: defaults.timezone,
    signature: defaults.signature,
  });
  const { status, errorMessage, save } = useSavePanel("profile");

  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Profile</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your account profile</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep your identity, contact details, time zone, and signature ready for deals, invoices, and team activity.
          </p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
          {(values.first_name || values.email || "A").slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Field label="First name" value={values.first_name} onChange={(value) => update("first_name", value)} />
        <Field label="Last name" value={values.last_name} onChange={(value) => update("last_name", value)} />
        <Field label="Email" type="email" value={values.email} onChange={(value) => update("email", value)} />
        <Field label="Phone" type="tel" value={values.phone} onChange={(value) => update("phone", value)} />
        <Field label="Title / role" value={values.title} onChange={(value) => update("title", value)} />
        <label className="grid gap-2 text-sm font-medium">
          Time zone
          <select
            value={values.timezone}
            onChange={(event) => update("timezone", event.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option>America/New_York</option>
            <option>America/Chicago</option>
            <option>America/Denver</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">
          Signature
          <textarea
            rows={4}
            value={values.signature}
            onChange={(event) => update("signature", event.target.value)}
            placeholder="Name, role, company, phone, and preferred booking link."
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
      </div>

      <PanelSaveBar status={status} errorMessage={errorMessage} onSave={() => save(values)} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}
