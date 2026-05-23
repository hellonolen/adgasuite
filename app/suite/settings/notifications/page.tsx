"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PanelSaveBar, useSavePanel } from "@/components/suite/SettingsLayout";

type DigestCadence = "off" | "daily" | "weekly";

interface InAppToggles {
  dealMoves: boolean;
  approvalNeeded: boolean;
  mention: boolean;
  documentSigned: boolean;
}

interface NotificationsState {
  emailDigest: DigestCadence;
  inApp: InAppToggles;
  slackWebhook: string;
  teamsWebhook: string;
}

const DIGEST_OPTIONS: { value: DigestCadence; label: string; description: string }[] = [
  { value: "off", label: "Off", description: "No digest emails." },
  { value: "daily", label: "Daily", description: "One summary every weekday at 7:00 local." },
  { value: "weekly", label: "Weekly", description: "One summary every Monday at 7:00 local." },
];

const IN_APP_TOGGLES: { key: keyof InAppToggles; label: string; description: string }[] = [
  { key: "dealMoves", label: "Deal moves", description: "A deal you own changes stage or value." },
  { key: "approvalNeeded", label: "Approval needed", description: "An agent proposes an action that needs your sign-off." },
  { key: "mention", label: "Mention", description: "Someone @mentions you in a deal note or document." },
  { key: "documentSigned", label: "Document signed", description: "A counterparty completes a signature request." },
];

export default function NotificationsSettingsPage() {
  const [state, setState] = useState<NotificationsState>({
    emailDigest: "daily",
    inApp: { dealMoves: true, approvalNeeded: true, mention: true, documentSigned: true },
    slackWebhook: "",
    teamsWebhook: "",
  });
  const { status, errorMessage, save } = useSavePanel("notifications");

  const setDigest = (value: DigestCadence) =>
    setState((prev) => ({ ...prev, emailDigest: value }));

  const setToggle = (key: keyof InAppToggles, value: boolean) =>
    setState((prev) => ({ ...prev, inApp: { ...prev.inApp, [key]: value } }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email digest</CardTitle>
          <CardDescription>How often to email you a summary of activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Email digest cadence</legend>
            {DIGEST_OPTIONS.map((option) => {
              const isActive = state.emailDigest === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                    isActive ? "border-primary/40 bg-primary/8" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="digest"
                    value={option.value}
                    checked={isActive}
                    onChange={() => setDigest(option.value)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              );
            })}
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">In-app notifications</CardTitle>
          <CardDescription>Control what triggers a notification inside the suite.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {IN_APP_TOGGLES.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <Switch
                checked={state.inApp[row.key]}
                onCheckedChange={(checked) => setToggle(row.key, checked === true)}
                aria-label={row.label}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhooks</CardTitle>
          <CardDescription>
            Forward notifications to Slack or Teams. Paste a webhook URL — provider sign-in is not required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="slack" className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Slack incoming webhook
            </Label>
            <Input
              id="slack"
              type="url"
              value={state.slackWebhook}
              onChange={(event) => setState((prev) => ({ ...prev, slackWebhook: event.target.value }))}
              placeholder="https://hooks.slack.com/services/…"
              autoComplete="off"
            />
          </div>
          <Separator />
          <div>
            <Label htmlFor="teams" className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Microsoft Teams webhook
            </Label>
            <Input
              id="teams"
              type="url"
              value={state.teamsWebhook}
              onChange={(event) => setState((prev) => ({ ...prev, teamsWebhook: event.target.value }))}
              placeholder="https://outlook.office.com/webhook/…"
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <PanelSaveBar status={status} errorMessage={errorMessage} onSave={() => save({ ...state })} />
    </div>
  );
}
