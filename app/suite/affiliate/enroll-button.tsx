"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function EnrollButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/affiliate/enroll", { method: "POST" });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || "Could not enroll. Try again or contact support.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={enroll}
        disabled={pending}
        className="w-fit bg-[#5d2cd6] text-white hover:bg-[#4a23ab]"
      >
        {pending ? "Setting up..." : "Get started"}
      </Button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
