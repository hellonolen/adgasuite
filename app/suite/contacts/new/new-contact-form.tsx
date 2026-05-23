"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().optional().or(z.literal("")),
  company: z.string().trim().optional().or(z.literal("")),
  linkedin_url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
  role_authority: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  status: z.string().trim().optional().or(z.literal("")),
});

type FormState = z.infer<typeof formSchema>;

const FIELDS: Array<{
  key: keyof FormState;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  full?: boolean;
}> = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: true },
  { key: "email", label: "Email", type: "email", placeholder: "name@company.com" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "title", label: "Title", placeholder: "Head of Corp Dev" },
  { key: "company", label: "Company", placeholder: "Sutter Maritime" },
  {
    key: "linkedin_url",
    label: "LinkedIn URL",
    type: "url",
    placeholder: "https://linkedin.com/in/…",
    full: true,
  },
  { key: "role_authority", label: "Role / Authority", placeholder: "Decision maker" },
  { key: "source", label: "Source", placeholder: "Conference, referral, inbound" },
  { key: "status", label: "Status", placeholder: "lead, qualified, customer" },
];

const initialState: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: "",
  company: "",
  linkedin_url: "",
  role_authority: "",
  source: "",
  status: "lead",
};

export default function NewContactForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(parsed.data),
      });
      const json = (await response.json()) as { ok: boolean; contact?: { id: string }; error?: string };
      if (!response.ok || !json.ok || !json.contact) {
        throw new Error(json.error || "Failed to create contact");
      }
      router.push(`/suite/contacts/${json.contact.id}`);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create contact");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f9f7f4]">
      <header className="border-b border-[#e8e4de] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-5">
          <Link
            href="/suite/contacts"
            className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b6760] hover:text-[#0d0c0a]"
          >
            ← Contacts
          </Link>
          <div className="h-4 w-px bg-[#e8e4de]" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b6760]">Workspace</div>
            <h1 className="text-lg font-semibold text-[#0d0c0a]">New contact</h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-6">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-[#e8e4de] bg-white p-6 shadow-sm"
          noValidate
        >
          {serverError && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {serverError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label
                key={field.key}
                className={`block ${field.full ? "sm:col-span-2" : ""}`}
              >
                <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.1em] text-[#6b6760]">
                  <span>
                    {field.label}
                    {field.required && <span className="ml-0.5 text-[#5d2cd6]">*</span>}
                  </span>
                  {errors[field.key] && <span className="text-rose-600 normal-case tracking-normal">{errors[field.key]}</span>}
                </span>
                <input
                  type={field.type || "text"}
                  value={values[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={`mt-1 w-full rounded-md border px-3 py-2 text-sm text-[#0d0c0a] focus:outline-none focus:ring-2 ${
                    errors[field.key]
                      ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-200/50"
                      : "border-[#e8e4de] bg-[#f9f7f4] focus:border-[#5d2cd6] focus:ring-[#5d2cd6]/15"
                  }`}
                />
              </label>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Link
              href="/suite/contacts"
              className="rounded-full border border-[#e8e4de] px-5 py-2 text-sm font-medium text-[#0d0c0a] hover:border-[#cbb8ff]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#5d2cd6] px-5 py-2 text-sm font-medium text-white hover:bg-[#4a22b3] disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Create contact"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
