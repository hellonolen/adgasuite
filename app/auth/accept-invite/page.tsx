"use client";

import React, { useEffect, useState } from "react";

export default function AcceptInvitePage() {
  const [status, setStatus] = useState("Checking invite...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("This invite link is missing a token.");
      return;
    }

    fetch("/api/team/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          redirect?: string;
          email?: string;
        };
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not accept this invite.");
        setStatus(`Welcome, ${data.email}. Loading your workspace...`);
        window.setTimeout(() => {
          window.location.href = data.redirect || "/suite";
        }, 900);
      })
      .catch((error) => setStatus(error.message || "Could not accept this invite."));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f9f7f4]">
      <div className="w-full max-w-md rounded-2xl border border-[#e8e4de] bg-white p-8 shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b6760]">Invite</span>
        <h1 className="mt-2 text-2xl font-semibold text-[#0d0c0a]">Joining your team</h1>
        <p className="mt-3 text-sm text-[#6b6760]">{status}</p>
        <div className="mt-4">
          <a href="/login" className="text-xs font-medium uppercase tracking-[0.12em] text-[#5d2cd6] hover:text-[#4920b3]">
            Sign in another way
          </a>
        </div>
      </div>
    </main>
  );
}
