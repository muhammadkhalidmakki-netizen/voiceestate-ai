"use client";

import { useMemo } from "react";
import { usePlanner } from "../planner-context";
import SettingsDialog from "../settings/SettingsDialog";
import Flag from "../settings/Flag";
import BestSalesFull from "./BestSalesFull";
import LeadsFull from "./LeadsFull";
import { fmtAed, fmtCplRange } from "@/lib/market-planning/format";
import { marketStats, sortStats, type SortKey } from "./stats";
import h from "../shell/hero.module.css";
import ui from "../ui.module.css";
import b from "./breakdown.module.css";

const TITLES: Record<SortKey, string> = { budget: "Monthly investment", leads: "Estimated leads", sales: "Best markets for sales", cpl: "Estimated leads" };

/**
 * The full list behind a card: every market, laid out exactly as in the card (budget share, leads with cost per
 * lead, or best markets for sales), scrollable, with a one-line summary. Click a market for its chart.
 */
export default function MarketBreakdownDialog({
  open,
  onOpenChange,
  initialSort,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialSort: SortKey;
  onPick: (iso2: string) => void;
}) {
  const { rows, state, plan, pct, effectiveCloseRate } = usePlanner();
  const kind: "budget" | "leads" | "sales" = initialSort === "cpl" ? "leads" : initialSort;
  const stats = useMemo(() => marketStats(rows, state.closeRate, state.languages), [rows, state.closeRate, state.languages]);
  const list = useMemo(() => sortStats(stats, kind), [stats, kind]);
  const totalSpend = stats.reduce((s, m) => s + (m.spend ?? 0), 0);
  const totalSales = stats.reduce((s, m) => s + (m.sales ?? 0), 0);
  const maxShare = Math.max(0.0001, ...stats.map((m) => m.share));

  const summary =
    kind === "budget"
      ? `${stats.length} markets · ${fmtAed(Math.round(totalSpend))} a month`
      : kind === "leads"
        ? `${stats.length} markets · ${plan.leads.lo === null ? "—" : `≈ ${Math.round(plan.leads.lo)}${plan.leads.hi === null ? "+" : ""}`} leads · average CPL ${fmtCplRange(plan.blendedCpl) ?? "—"}`
        : `${stats.length} markets · ≈ ${totalSales.toFixed(1)} sales (illustrative, about ${Math.round(effectiveCloseRate * 1000) / 10}% close rate for your mix)`;

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={TITLES[initialSort]}
      lead={summary}
      footer={
        <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
          Done
        </button>
      }
    >
      {kind === "leads" ? (
        <LeadsFull stats={stats} onPick={onPick} />
      ) : kind === "budget" ? (
        <div className={b.scrollList}>
        <ul className={h.hb}>
          {list.map((m) => (
            <li key={m.iso2}>
              <button type="button" className={h.hbRow} onClick={() => onPick(m.iso2)}>
                <Flag iso2={m.iso2} name={m.name} />
                <span className={h.hbName}>{m.name}</span>
                <span className={h.hbTrack} aria-hidden="true">
                  <span data-pending={m.row.cpl ? undefined : "true"} style={{ width: `${Math.max(24, (m.share / maxShare) * 100)}%` }}>
                    <i>{pct[m.iso2] ?? 0}%</i>
                  </span>
                </span>
                <b className={h.hbVal}>{m.spend === null ? "—" : fmtAed(Math.round(m.spend))}</b>
              </button>
            </li>
          ))}
        </ul>
        </div>
      ) : (
        <BestSalesFull stats={stats} onPick={onPick} />
      )}
    </SettingsDialog>
  );
}
