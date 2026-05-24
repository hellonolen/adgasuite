"use client";

import { useEffect } from "react";

type AdpThankYouTrackerProps = {
  affiliateCode: string;
  affiliateUrl: string;
  leadId?: string;
};

export function AdpThankYouTracker({ affiliateCode, affiliateUrl, leadId }: AdpThankYouTrackerProps) {
  useEffect(() => {
    fetch("/api/partners/adp/thank-you", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliate_code: affiliateCode,
        affiliate_url: affiliateUrl,
        lead_id: leadId || null,
        source_path: "/adp/thank-you",
      }),
      keepalive: true,
    }).catch(() => {});
  }, [affiliateCode, affiliateUrl, leadId]);

  return null;
}
