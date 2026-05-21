"use client";

import { useState, useEffect } from "react";

export function useSuiteState() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/suite/state");
      if (!res.ok) throw new Error("Failed to fetch suite state");
      const data = await res.json();
      setState(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return { state, loading, error, refresh };
}
