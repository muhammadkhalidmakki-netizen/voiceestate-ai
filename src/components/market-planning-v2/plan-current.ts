"use client";

import { useSyncExternalStore } from "react";

// Which saved plan is being edited. Shared by every Saved plans button on the page (top bar and sticky bar) and
// remembered in this browser so a refresh keeps it.
export type CurrentPlan = { id: string; name: string; snapshot: string };
const KEY = "mp2_current_plan_v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: CurrentPlan | null } = { raw: undefined as unknown as null, value: null };

function read(): CurrentPlan | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* blocked */
  }
  if (cache.raw === raw) return cache.value;
  let value: CurrentPlan | null = null;
  try {
    value = raw ? (JSON.parse(raw) as CurrentPlan) : null;
  } catch {
    value = null;
  }
  cache = { raw, value };
  return value;
}

export function setCurrentPlan(v: CurrentPlan | null) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    cache = { raw: v ? JSON.stringify(v) : null, value: v };
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

export const useCurrentPlan = () => useSyncExternalStore(subscribe, read, () => null);
