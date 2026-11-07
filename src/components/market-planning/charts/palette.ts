"use client";

import { useSyncExternalStore } from "react";

/** Chart colours read from the planner's CSS tokens, so charts follow the active theme. */
export type Palette = {
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  surface: string;
  tint: string;
  blue: string;
  blueDeep: string;
  blueSoft: string;
  violet: string;
  hatch: string;
  amber: string;
  dark: boolean;
};

const LIGHT: Palette = {
  ink: "#0f1330",
  ink2: "#46506f",
  ink3: "#5b6684",
  line: "#e2e8f7",
  surface: "#ffffff",
  tint: "#f3f6fd",
  blue: "#2f6bff",
  blueDeep: "#1b3fb8",
  blueSoft: "#e8eeff",
  violet: "#7c6cf6",
  hatch: "rgba(47,107,255,0.2)",
  amber: "#8a5a00",
  dark: false,
};

function root(): HTMLElement | null {
  return typeof document === "undefined" ? null : document.querySelector<HTMLElement>("[data-mp-root]");
}

/** Where tokens are read from: a variant scope inside the root, if one exists. */
function scope(): HTMLElement | null {
  return typeof document === "undefined"
    ? null
    : (document.querySelector<HTMLElement>("[data-mp-scope]") ?? root());
}

function read(): Palette {
  const el = scope();
  if (!el) return LIGHT;
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--mp-ink", LIGHT.ink),
    ink2: v("--mp-ink-2", LIGHT.ink2),
    ink3: v("--mp-ink-3", LIGHT.ink3),
    line: v("--mp-line", LIGHT.line),
    surface: v("--mp-surface", LIGHT.surface),
    tint: v("--mp-tint", LIGHT.tint),
    blue: v("--mp-blue", LIGHT.blue),
    blueDeep: v("--mp-blue-deep", LIGHT.blueDeep),
    blueSoft: v("--mp-blue-soft", LIGHT.blueSoft),
    violet: v("--mp-violet", LIGHT.violet),
    hatch: v("--mp-hatch", LIGHT.hatch),
    amber: v("--mp-amber", LIGHT.amber),
    dark: cs.colorScheme.includes("dark"),
  };
}

let cached: Palette = LIGHT;
let cachedKey = "";

function snapshot(): Palette {
  const el = root();
  const key = `${el?.getAttribute("data-theme") ?? ""}|${typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cached = read();
  }
  return cached;
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

export function useChartPalette(): Palette {
  return useSyncExternalStore(subscribe, snapshot, () => LIGHT);
}

export function useIsDark(): boolean {
  return useChartPalette().dark;
}
