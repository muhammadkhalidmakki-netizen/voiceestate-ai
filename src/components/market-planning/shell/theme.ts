"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const root = () => (typeof document === "undefined" ? null : document.querySelector<HTMLElement>("[data-mp-root]"));

function effective(): Theme {
  const saved = root()?.getAttribute("data-theme");
  if (saved === "light" || saved === "dark") return saved;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const el = root();
  const mo = el ? new MutationObserver(cb) : null;
  if (el && mo) mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    mo?.disconnect();
    mq.removeEventListener("change", cb);
  };
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, effective, () => "light" as Theme);
  const set = (t: Theme) => {
    root()?.setAttribute("data-theme", t);
    // Remembered for a year so the server renders the right theme on the next visit.
    document.cookie = `mp_theme=${t}; path=/dubai; max-age=31536000; samesite=lax`;
  };
  return [theme, set];
}

/** Radix portals must render inside the planner root so they inherit its tokens. */
export function portalContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined;
  return document.querySelector<HTMLElement>("[data-mp-scope]") ?? root() ?? undefined;
}
