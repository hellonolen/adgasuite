"use client";

import { useEffect, useState } from "react";

const ROLE_OPTIONS = [
  { value: "member", label: "Member — view and operate" },
  { value: "admin", label: "Admin — manage workspace settings" },
];

type Status = "idle" | "sending" | "sent" | "error";

export function InviteTeammate() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirect: "/suite" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: boolean;
        skipped?: boolean;
        previewUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Could not send the invite.");
        return;
      }
      setStatus("sent");
      const target = `${email} as ${role}`;
      setMessage(
        data.previewUrl
          ? `Invite ready for ${target}. Preview link copied below.`
          : `Magic-link invite sent to ${target}.`,
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
          setMessage("");
        }}
        className="inline-flex items-center justify-center rounded-md bg-[#5d2cd6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4a23ac]"
      >
        Invite teammate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--rule,#e8e4de)] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6760]">
                  Invite
                </div>
                <h2 id="invite-modal-title" className="mt-1 text-lg font-semibold text-[#0d0c0a]">
                  Add a teammate
                </h2>
                <p className="mt-1 text-xs text-[#6b6760]">
                  They'll get a sign-in link by email. No password to remember.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-[#6b6760] hover:bg-[#f1ede8] hover:text-[#0d0c0a]"
              >
                ✕
              </button>
            </div>

            <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6760]">
                  Work email
                </span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@company.com"
                  className="rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6760]">
                  Role
                </span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="rounded-md border border-[var(--rule,#e8e4de)] bg-white px-3 py-2 text-sm text-[#0d0c0a] outline-none focus:border-[#5d2cd6] focus:ring-2 focus:ring-[#5d2cd6]/20"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {message && (
                <div
                  className={`rounded-md border px-3 py-2 text-xs ${
                    status === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-[#4f485d] hover:bg-[#f1ede8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex items-center justify-center rounded-md bg-[#5d2cd6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4a23ac] disabled:opacity-50"
                >
                  {status === "sending" ? "Sending…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
