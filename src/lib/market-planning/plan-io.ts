// Saving, sharing and exporting a plan. Pure helpers: no DOM, no data imports.
// A plan is validated on the way in, so a hand-edited link or stored value can never
// put the planner into an impossible state.

export type StoredPlan = {
  mode: "budget" | "leads";
  amountText: string;
  shares: Record<string, number>;
  metaShare: number;
  languages: Record<string, "fluent" | "professional" | "conversational">;
  assumedCpl: Record<string, number>;
  closeRate: number;
  timingProvisional: boolean;
  /** How the market list was produced. Plans saved before this field existed are treated as custom. */
  selection?: "recommended" | "custom";
  /** Markets the user removed from the recommendations. */
  excluded?: string[];
};

const LEVELS = new Set(["fluent", "professional", "conversational"]);

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Returns a clean plan or null. The `isKnown*` callbacks keep this layer free of data imports. */
export function sanitizePlan(
  raw: unknown,
  isKnownCountry: (iso2: string) => boolean,
  isKnownLanguage: (code: string) => boolean,
  maxCloseRate = 0.5,
): StoredPlan | null {
  if (!isObj(raw)) return null;
  if (raw.mode !== "budget" && raw.mode !== "leads") return null;
  if (typeof raw.amountText !== "string" || raw.amountText.length > 20) return null;

  if (!isObj(raw.shares)) return null;
  const entries = Object.entries(raw.shares).filter(
    ([k, v]) => isKnownCountry(k) && typeof v === "number" && Number.isFinite(v) && v >= 0,
  ) as Array<[string, number]>;
  if (entries.length === 0 || entries.length > 249) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const shares = Object.fromEntries(
    entries.map(([k, v]) => [k, total > 0 ? v / total : 1 / entries.length]),
  );

  const meta =
    typeof raw.metaShare === "number" && Number.isFinite(raw.metaShare)
      ? Math.min(1, Math.max(0, raw.metaShare))
      : 0.5;

  const languages: StoredPlan["languages"] = {};
  if (isObj(raw.languages)) {
    for (const [k, v] of Object.entries(raw.languages)) {
      if (isKnownLanguage(k) && typeof v === "string" && LEVELS.has(v)) {
        languages[k] = v as StoredPlan["languages"][string];
      }
    }
  }

  const assumedCpl: Record<string, number> = {};
  if (isObj(raw.assumedCpl)) {
    for (const [k, v] of Object.entries(raw.assumedCpl)) {
      if (k in shares && typeof v === "number" && Number.isFinite(v) && v > 0 && v < 100000) {
        assumedCpl[k] = v;
      }
    }
  }

  const rate =
    typeof raw.closeRate === "number" &&
    Number.isFinite(raw.closeRate) &&
    raw.closeRate > 0 &&
    raw.closeRate <= maxCloseRate
      ? raw.closeRate
      : 0.015;

  const excluded = Array.isArray(raw.excluded)
    ? [...new Set(raw.excluded.filter((k): k is string => typeof k === "string" && isKnownCountry(k)))].slice(0, 249)
    : [];

  return {
    mode: raw.mode,
    amountText: raw.amountText,
    shares,
    metaShare: meta,
    languages,
    assumedCpl,
    closeRate: rate,
    timingProvisional: raw.timingProvisional !== false,
    selection: raw.selection === "recommended" ? "recommended" : "custom",
    excluded,
  };
}

const b64 = {
  enc: (s: string) =>
    btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))),
};

export function encodePlan(plan: StoredPlan): string {
  return b64.enc(JSON.stringify(plan));
}

export function decodePlan(token: string): unknown {
  try {
    return JSON.parse(b64.dec(token));
  } catch {
    return null;
  }
}

/** CSV cell escaping, including protection against spreadsheet formula injection. */
export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
