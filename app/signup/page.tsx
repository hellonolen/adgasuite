"use client";

import React, { useState } from "react";
import { z } from "zod";
import { getCopyright } from "@/lib/marketing-config";

const signupSchema = z.object({
  first_name: z.string().trim().min(1, "Add your first name."),
  email: z.string().trim().email("Enter a valid email."),
});

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; message: string }
  | { kind: "error"; message: string };

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const isSubmitting = status.kind === "submitting";

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = signupSchema.safeParse({ first_name: firstName, email });
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message || "Check your details." });
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const response = await fetch("/api/auth/magic/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          first_name: parsed.data.first_name,
          redirect: "/suite/onboarding",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: data.error || "Could not start signup. Try again." });
        return;
      }
      setStatus({ kind: "sent", message: data.message || "Check your email for your ADGA sign-in link." });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
  }

  return (
    <>
    <style>{`
      body::before { display: none !important; }
      body { background: #ffffff !important; }
    `}</style>
    <main style={{ minHeight: "100vh", background: "#fff", color: "#0d0c0a" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 46 }}>
          <a href="/" style={{ color: "#0d0c0a", fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em", textDecoration: "none" }}>ADGA</a>
          <a href="/login" style={{ color: "#0d0c0a", fontSize: 14, fontWeight: 650, textDecoration: "none" }}>Sign in</a>
        </header>

        {status.kind === "sent" ? (
          <section style={{ maxWidth: 520 }}>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.025em", fontWeight: 800 }}>Check your email.</h1>
            <p style={{ margin: "12px 0 0", color: "#4b4741", fontSize: 15, lineHeight: 1.5 }}>{status.message}</p>
          </section>
        ) : (
          <section style={{ maxWidth: 520 }}>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.025em", fontWeight: 800 }}>Sign up.</h1>
            <p style={{ margin: "10px 0 0", color: "#4b4741", fontSize: 15, lineHeight: 1.45 }}>
              Create your ADGA account. You can choose a plan after you enter the suite.
            </p>

            <form onSubmit={submit} noValidate style={{ marginTop: 24, display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gap: 7 }}>
                <label htmlFor="signup-first-name" style={{ color: "#3a352f", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>First name</label>
                <input
                  id="signup-first-name"
                  name="first_name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  type="text"
                  autoComplete="given-name"
                  placeholder="Maren"
                  required
                  disabled={isSubmitting}
                  style={{ border: "1px solid #cfc7b9", borderRadius: 8, background: "#fff", color: "#0d0c0a", fontSize: 16, padding: "12px 13px", outlineColor: "#5d2cd6" }}
                />
              </div>

              <div style={{ display: "grid", gap: 7 }}>
                <label htmlFor="signup-email" style={{ color: "#3a352f", fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Email</label>
                <input
                  id="signup-email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  disabled={isSubmitting}
                  style={{ border: "1px solid #cfc7b9", borderRadius: 8, background: "#fff", color: "#0d0c0a", fontSize: 16, padding: "12px 13px", outlineColor: "#5d2cd6" }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ justifySelf: "start", border: 0, borderRadius: 8, background: "#5d2cd6", color: "#fff", cursor: isSubmitting ? "wait" : "pointer", fontSize: 15, fontWeight: 800, padding: "12px 18px", opacity: isSubmitting ? 0.72 : 1 }}
              >
                {isSubmitting ? "Sending link..." : "Sign up"}
              </button>

              {status.kind === "error" && (
                <p role="alert" style={{ margin: 0, color: "#b42318", fontSize: 14, lineHeight: 1.45 }}>{status.message}</p>
              )}
            </form>
          </section>
        )}

        <footer style={{ marginTop: 64, color: "#4b4741", fontSize: 13 }}>{getCopyright()}</footer>
      </div>
    </main>
    </>
  );
}
