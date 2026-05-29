"use client";

/**
 * SuiteContext — shared state for every workspace. Extracted from the AdgaSuite monolith so
 * per-workspace renderers can consume it without importing the entire 8000-line component.
 *
 * Today this is a thin pass-through: the App component inside AdgaSuite.tsx still owns the
 * underlying state, and mounts <SuiteContextProvider value={...}/> around its tree. As more
 * workspaces extract out of the monolith, their state migrates here.
 */

import React from "react";
import { useEventStream } from "@/lib/events/hooks";

export interface SuiteUser {
  id: string;
  name: string;
  role: "owner" | "member" | "guest";
  email?: string;
}

export interface SuiteContextValue {
  user: SuiteUser;
  /** Current deal records — seeded for unauthenticated previews, real data for signed-in users. */
  deals: any[];
  /** Lead records. */
  leads: any[];
  /** Open a deal in the drawer. */
  openDeal: (deal: any) => void;
  /** Visual / theme tweaks. */
  tweaks: Record<string, unknown>;
  setTweak: (key: string | Record<string, unknown>, value?: unknown) => void;
  /** Programmatic navigation (uses Next.js router under the hood). */
  navigate: (route: string, options?: { keepLeadSelection?: boolean }) => void;
  /** Open quick-create modal for a record type. */
  setQuickCreate: (type: string | null) => void;
}

const SuiteContext = React.createContext<SuiteContextValue | null>(null);

export function SuiteContextProvider({
  value,
  children,
}: {
  value: SuiteContextValue;
  children: React.ReactNode;
}) {
  // GAP #6: mount the event stream once at the suite shell so every workspace's
  // useSuiteEvent() listeners receive server-emitted events without each one
  // having to wire its own poll loop.
  useEventStream();
  return <SuiteContext.Provider value={value}>{children}</SuiteContext.Provider>;
}

export function useSuite(): SuiteContextValue {
  const ctx = React.useContext(SuiteContext);
  if (!ctx) {
    throw new Error("useSuite must be called inside a SuiteContextProvider — wrap the workspace in the suite layout.");
  }
  return ctx;
}

/** Read-only convenience hook for components that only need user info. */
export function useSuiteUser(): SuiteUser {
  return useSuite().user;
}
