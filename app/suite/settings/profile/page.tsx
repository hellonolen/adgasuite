"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PanelSaveBar, useSavePanel } from "@/components/suite/SettingsLayout";

interface ProfileState {
  fullName: string;
  email: string;
  avatarUrl: string;
  timezone: string;
  defaultDealType: string;
  signature: string;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
];

const DEAL_TYPES = ["M&A", "Asset purchase", "Joint venture", "Equity raise", "Debt financing"];

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileState>({
    fullName: "",
    email: "",
    avatarUrl: "",
    timezone: "America/New_York",
    defaultDealType: "M&A",
    signature: "",
  });
  const { status, errorMessage, save } = useSavePanel("profile");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/suite/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const email = data?.user?.email ?? "";
        setProfile((prev) => ({
          ...prev,
          email,
          fullName: email ? email.split("@")[0].replace(/[._-]+/g, " ") : "",
          signature: email ? `— ${email.split("@")[0]} · ADGA` : "",
        }));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = <K extends keyof ProfileState>(key: K, value: ProfileState[K]) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity</CardTitle>
          <CardDescription>How you appear inside the workspace and on outbound communications.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field id="fullName" label="Full name">
            <Input
              id="fullName"
              value={profile.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              placeholder={loading ? "Loading…" : "Maren Voss"}
              disabled={loading}
            />
          </Field>
          <Field id="email" label="Email" hint="Tied to your session. Contact support to change.">
            <Input id="email" value={profile.email} readOnly aria-readonly="true" className="bg-muted/40" />
          </Field>
          <Field
            id="avatarUrl"
            label="Avatar URL"
            hint="Public image URL. Square crop, ≥ 128px works best."
            className="md:col-span-2"
          >
            <Input
              id="avatarUrl"
              type="url"
              value={profile.avatarUrl}
              onChange={(event) => onChange("avatarUrl", event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workspace defaults</CardTitle>
          <CardDescription>Used to pre-fill new deals, calendar events, and approvals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field id="timezone" label="Time zone">
            <NativeSelect
              id="timezone"
              value={profile.timezone}
              onChange={(value) => onChange("timezone", value)}
              options={TIMEZONES}
            />
          </Field>
          <Field id="defaultDealType" label="Default deal type">
            <NativeSelect
              id="defaultDealType"
              value={profile.defaultDealType}
              onChange={(value) => onChange("defaultDealType", value)}
              options={DEAL_TYPES}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email signature</CardTitle>
          <CardDescription>Appended to outbound emails sent through the suite.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <Label htmlFor="signature" className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Signature
          </Label>
          <textarea
            id="signature"
            value={profile.signature}
            onChange={(event) => onChange("signature", event.target.value)}
            rows={5}
            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="— Maren Voss · ADGA"
          />
        </CardContent>
      </Card>

      <PanelSaveBar
        status={status}
        errorMessage={errorMessage}
        onSave={() => save({ ...profile })}
        disabled={loading}
      />
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

function NativeSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
