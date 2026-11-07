import type { MarketRow } from "../planner-context";
import { marketCloseRate, marketQuality, qualityEmphasis } from "@/lib/market-planning/intel/dashboard";
import type { Proficiency } from "@/lib/market-planning/intel/recommend";

export type MarketStat = {
  row: MarketRow;
  iso2: string;
  name: string;
  spend: number | null;
  share: number;
  leadsLo: number | null;
  leadsMore: boolean;
  /** Mid-point CPL used only for ordering and comparison. */
  cplMid: number | null;
  /** Illustrative sales: conservative leads x the one global close rate. */
  sales: number | null;
  /** This market's own close rate (the base rate scaled by its buyer score). */
  closeRate: number;
  /** Buyer quality 0..1 for the selected languages (null = unknown). Not a close rate. */
  quality: number | null;
  /** Leads weighted by buyer quality to the same power the recommendation uses. Ranks markets by likely sales, so cheap leads from weak buyer markets do not win. */
  fitScore: number | null;
};

/** Quality used for ranking when a market has no buyer data: a cautious middle-low value. */
const UNKNOWN_QUALITY = 0.35;

export type SortKey = "sales" | "leads" | "budget" | "cpl";

export function marketStats(rows: MarketRow[], closeRate: number, languages: Record<string, Proficiency> = { en: "professional" }): MarketStat[] {
  return rows.map((row) => {
    const cpl = row.cpl;
    const quality = marketQuality(row.iso2, languages);
    const rate = marketCloseRate(row.iso2, closeRate, languages);
    return {
      row,
      iso2: row.iso2,
      name: row.country.name,
      spend: row.spend.hi ?? row.spend.lo,
      share: row.share,
      leadsLo: row.leads.lo,
      leadsMore: row.leads.hi === null && row.leads.lo !== null,
      cplMid: cpl ? (cpl.lo !== null ? (cpl.lo + cpl.hi) / 2 : cpl.hi) : null,
      sales: row.leads.lo === null ? null : row.leads.lo * rate,
      closeRate: rate,
      quality,
      fitScore: row.leads.lo === null ? null : row.leads.lo * Math.pow(quality ?? UNKNOWN_QUALITY, qualityEmphasis()),
    };
  });
}

/** Sort a copy; markets without a value always go last, whatever the direction. */
export function sortStats(list: MarketStat[], key: SortKey, dir: "desc" | "asc" = key === "cpl" ? "asc" : "desc"): MarketStat[] {
  const val = (m: MarketStat): number | null =>
    key === "sales" ? m.fitScore : key === "leads" ? m.leadsLo : key === "budget" ? m.spend : m.cplMid;
  const sign = dir === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    if (x === null && y === null) return b.share - a.share;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * sign || b.share - a.share;
  });
}

/** Short CPL for tight spaces: "70", "30 or less" as "≤30", "45–78". */
export function cplShort(cpl: MarketRow["cpl"]): string {
  if (!cpl) return "pending";
  const r = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n)));
  if (cpl.lo === null) return `≤${r(cpl.hi)}`;
  if (Math.round(cpl.lo) === Math.round(cpl.hi)) return r(cpl.hi);
  return `${r(cpl.lo)}–${r(cpl.hi)}`;
}

export const leadsText = (m: MarketStat) => (m.leadsLo === null ? "pending" : `${Math.round(m.leadsLo)}${m.leadsMore ? "+" : ""}`);
export const salesText = (m: MarketStat) => (m.sales === null ? "—" : `${m.sales.toFixed(1)}${m.leadsMore ? "+" : ""}`);
