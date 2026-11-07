"use client";

import { motion } from "motion/react";
import { usePlanner } from "../planner-context";
import Flag from "../settings/Flag";
import OpportunityTip from "../settings/OpportunityTip";
import { marketStats, salesText, sortStats } from "../breakdown/stats";
import { isWeakForSales } from "@/lib/market-planning/intel/dashboard";
import s from "./hero.module.css";

const SHOWN = 6;

/**
 * Markets ranked by expected sales, best first, in two compact columns. Sales are ILLUSTRATIVE (conservative
 * leads x one global close rate), so this mostly shows where the budget buys the most leads.
 */
export default function BestSalesList({ onOpenCountry, onOpenAll }: { onOpenCountry: (iso2: string) => void; onOpenAll: () => void }) {
  const { rows, state } = usePlanner();
  const list = sortStats(marketStats(rows, state.closeRate, state.languages), "sales").filter((m) => m.fitScore !== null);
  const shown = list.slice(0, SHOWN);
  const max = Math.max(0.0001, ...shown.map((m) => m.fitScore ?? 0));

  if (shown.length === 0) return <p className={s.invNote}>No sales estimate yet: add a cost per lead to your markets.</p>;

  return (
    <div className={s.bs}>
      <ol className={s.bsGrid} aria-label="Markets ranked by expected sales, best first (illustrative)">
        {shown.map((m, i) => (
          <li key={m.iso2}>
            <OpportunityTip iso2={m.iso2} name={m.name}>
            <button type="button" className={`${s.bsRow} ${isWeakForSales(m.iso2, state.languages) ? s.bsWeak : ""}`} onClick={() => onOpenCountry(m.iso2)}>
              <span className={s.bsRank}>{i + 1}</span>
              <Flag iso2={m.iso2} name={m.name} />
              <span className={s.bsText}>
                <span className={s.bsName}>{m.name}{isWeakForSales(m.iso2, state.languages) ? <span className={s.bsWeakTag} title="Weak for sales: low buyer score, so few leads become sales">weak</span> : null}</span>
                <span className={s.bsBar} aria-hidden="true">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(5, ((m.fitScore ?? 0) / max) * 100)}%` }} transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }} />
                </span>
              </span>
              <b className={s.bsVal}>≈ {salesText(m)}</b>
            </button>
            </OpportunityTip>
          </li>
        ))}
      </ol>
      <div className={s.bsFoot}>
        <button type="button" className={s.invMore} onClick={onOpenAll}>
          {list.length > shown.length ? `+${list.length - shown.length} more markets · ` : ""}See the full breakdown
        </button>
        <span className={s.invNote}>Ranked by buyer quality and leads, not cheap leads alone. Sales are illustrative.</span>
      </div>
    </div>
  );
}
