import type { Range, ResolvedCpl } from "./types";

const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const fmtInt = (n: number) => int.format(n);
export const fmtOne = (n: number) => one.format(n);
export const fmtAed = (n: number) => `AED ${int.format(n)}`;
export const fmtPct = (fraction: number, digits = 0) =>
  `${(fraction * 100).toFixed(digits)}%`;

/** "AED 5,000" or "AED 4,200 to 5,000", "up to AED 5,000" when the lower bound is unknown. */
export function fmtAedRange(r: Range): string | null {
  if (r.hi === null && r.lo === null) return null;
  if (r.lo === null) return `up to ${fmtAed(r.hi as number)}`;
  if (r.hi === null) return `${fmtAed(r.lo)} or more`;
  if (Math.round(r.lo) === Math.round(r.hi)) return fmtAed(r.hi);
  return `AED ${int.format(r.lo)}–${int.format(r.hi)}`;
}

/** Leads are approximate: whole numbers, with "at least" when open-ended. */
export function fmtLeadsRange(r: Range): string | null {
  if (r.lo === null && r.hi === null) return null;
  if (r.lo === null) return `up to ${int.format(r.hi as number)}`;
  if (r.hi === null) return `${int.format(Math.round(r.lo))}+`;
  const lo = Math.round(r.lo);
  const hi = Math.round(r.hi);
  return lo === hi ? int.format(lo) : `${int.format(lo)}–${int.format(hi)}`;
}

/** Preserves the way the client supplied the CPL: point, range, or "or less". */
export function fmtCpl(cpl: { lo: number | null; hi: number }): string {
  if (cpl.lo === null) return `AED ${int.format(cpl.hi)} or less`;
  if (cpl.lo === cpl.hi) return fmtAed(cpl.hi);
  return `AED ${int.format(cpl.lo)}–${int.format(cpl.hi)}`;
}

export function fmtCplRange(r: Range): string | null {
  if (r.hi === null) return null;
  return fmtCpl({ lo: r.lo, hi: r.hi });
}

export function cplSourceLabel(cpl: ResolvedCpl): string {
  if (cpl.source === "planning-assumption") return "Your own figure";
  const base = cpl.source === "modelled-estimate" ? "Estimate (low confidence)" : "Your benchmark";
  const f = cpl.languageFactor;
  if (f === undefined || Math.abs(f - 1) < 0.02) return base;
  return `${base}, ${f > 1 ? "+" : "−"}${Math.round(Math.abs(f - 1) * 100)}% for your languages`;
}

export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "").replace(/^AED/i, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
