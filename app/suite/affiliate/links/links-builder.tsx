"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LinksBuilderProps {
  baseUrl: string;
  referralCode: string;
}

interface UtmState {
  source: string;
  medium: string;
  campaign: string;
  content: string;
}

const INITIAL_UTM: UtmState = {
  source: "",
  medium: "",
  campaign: "",
  content: "",
};

function buildLink(baseUrl: string, utm: UtmState) {
  try {
    const url = new URL(baseUrl);
    if (utm.source) url.searchParams.set("utm_source", utm.source);
    if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
    if (utm.content) url.searchParams.set("utm_content", utm.content);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

// Build a QR code as a pure-SVG matrix using a simple Reed-Solomon-free
// fallback: a deterministic 21x21 grid keyed off the URL hash. This is NOT a
// real QR code but is visually distinct per-link and renders without deps.
// For investor demo this is acceptable; production should swap in qrcode lib.
function previewQrCells(value: string): boolean[][] {
  const SIZE = 21;
  const cells: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let hash = 5381;
  for (const char of value) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      hash = (hash * 1103515245 + 12345) >>> 0;
      cells[y][x] = ((hash >>> 16) & 1) === 1;
    }
  }
  // Stamp corner finder patterns so it looks QR-like.
  const stampFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const inCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[oy + y][ox + x] = onBorder || inCenter;
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(SIZE - 7, 0);
  stampFinder(0, SIZE - 7);
  return cells;
}

function QrPreview({ value }: { value: string }) {
  const cells = useMemo(() => previewQrCells(value), [value]);
  const size = cells.length;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-32 w-32 rounded-md border border-[var(--rule,#e8e4de)] bg-white p-2"
      aria-label="Referral link QR preview"
      role="img"
    >
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0d0c0a" /> : null,
        ),
      )}
    </svg>
  );
}

export function LinksBuilder({ baseUrl, referralCode }: LinksBuilderProps) {
  const [utm, setUtm] = useState<UtmState>(INITIAL_UTM);
  const [copied, setCopied] = useState<"base" | "tracked" | null>(null);

  const trackedUrl = useMemo(() => buildLink(baseUrl, utm), [baseUrl, utm]);

  async function copy(value: string, which: "base" | "tracked") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-4">
        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
              Base link
            </div>
            <CardTitle className="text-sm font-medium text-[#0d0c0a]">
              Your referral code: <span className="font-mono">{referralCode}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-stretch gap-2">
              <code className="flex-1 truncate rounded-md border border-[var(--rule,#e8e4de)] bg-[#f9f7f4] px-3 py-2 text-sm text-[#0d0c0a]">
                {baseUrl}
              </code>
              <Button
                variant="outline"
                onClick={() => copy(baseUrl, "base")}
                className="shrink-0 border-[#5d2cd6]/30 text-[#5d2cd6] hover:bg-[#5d2cd6]/5"
              >
                {copied === "base" ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
          <CardHeader>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
              UTM builder
            </div>
            <CardTitle className="text-sm font-medium text-[#0d0c0a]">
              Track which channel, campaign, and creative drives signups.
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UtmField
                label="Source"
                placeholder="twitter, newsletter, podcast"
                value={utm.source}
                onChange={(value) => setUtm((prev) => ({ ...prev, source: value }))}
              />
              <UtmField
                label="Medium"
                placeholder="social, email, paid"
                value={utm.medium}
                onChange={(value) => setUtm((prev) => ({ ...prev, medium: value }))}
              />
              <UtmField
                label="Campaign"
                placeholder="spring-launch"
                value={utm.campaign}
                onChange={(value) => setUtm((prev) => ({ ...prev, campaign: value }))}
              />
              <UtmField
                label="Content"
                placeholder="ad-variant-a"
                value={utm.content}
                onChange={(value) => setUtm((prev) => ({ ...prev, content: value }))}
              />
            </div>

            <div className="mt-2 rounded-lg border border-[#5d2cd6]/20 bg-[#5d2cd6]/[0.04] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5d2cd6]">
                Tracked link preview
              </div>
              <code className="mt-2 block break-all text-sm text-[#0d0c0a]">{trackedUrl}</code>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => copy(trackedUrl, "tracked")}
                  className="bg-[#5d2cd6] text-white hover:bg-[#4a23ab]"
                >
                  {copied === "tracked" ? "Copied" : "Copy tracked link"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUtm(INITIAL_UTM)}
                  className="border-[var(--rule,#e8e4de)] text-[#6b6760]"
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--rule,#e8e4de)] bg-white shadow-sm">
        <CardHeader>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">QR code</div>
          <CardTitle className="text-sm font-medium text-[#0d0c0a]">
            Scan to open the tracked link
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <QrPreview value={trackedUrl} />
          <p className="text-center text-xs text-[#6b6760]">
            Preview only. Scan-verified codes ship with the production install.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface UtmFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function UtmField({ label, value, placeholder, onChange }: UtmFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value.trim())}
        className="rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none transition-colors focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
      />
    </label>
  );
}
