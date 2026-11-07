"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import Flag from "../settings/Flag";
import { opportunityOf } from "@/lib/market-planning/intel/opportunity";
import { isWeakForSales } from "@/lib/market-planning/intel/dashboard";
import { usePlanner } from "../planner-context";
import { leadsText, salesText, type MarketStat } from "./stats";
import h from "../shell/hero.module.css";
import b from "./breakdown.module.css";

type By = "fit" | "leads" | "score";
const OPTIONS: Array<{ key: By; label: string; hint: string }> = [
  { key: "fit", label: "Sales fit", hint: "Buyer quality and leads together (the card's ranking)" },
  { key: "leads", label: "Leads", hint: "Estimated leads per month" },
  { key: "score", label: "Buyer score", hint: "How strong a buyer market it is, out of 100" },
];

/** Every market ranked for sales. Switch what it is ranked by, and open a row to see why it scores as it does. */
export default function BestSalesFull({ stats, onPick }: { stats: MarketStat[]; onPick: (iso2: string) => void }) {
  const { state } = usePlanner();
  const [by, setBy] = useState<By>("fit");
  const [open, setOpen] = useState<string | null>(null);

  const value = (m: MarketStat): number => (by === "fit" ? (m.fitScore ?? 0) : by === "leads" ? (m.leadsLo ?? 0) : opportunityOf(m.iso2)?.total ?? 0);
  const list = [...stats].sort((x, y) => value(y) - value(x));
  const max = Math.max(0.0001, ...list.map(value));

  return (
    <div className={b.bsFull}>
      <div className={b.seg} role="group" aria-label="Rank markets by">
        {OPTIONS.map((o) => (
          <button key={o.key} type="button" className={`${b.segBtn} ${by === o.key ? b.segOn : ""}`} aria-pressed={by === o.key} title={o.hint} onClick={() => setBy(o.key)}>
            {o.label}
          </button>
        ))}
      </div>

      <div className={b.scrollList}>
        <ol className={b.fullBest}>
          {list.map((m, i) => {
            const isOpen = open === m.iso2;
            const opp = isOpen ? opportunityOf(m.iso2) : null;
            return (
              <motion.li key={m.iso2} layout transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className={`${b.bsItem} ${isOpen ? b.bsItemOpen : ""}`}>
                <button type="button" className={`${h.bsRow} ${isWeakForSales(m.iso2, state.languages) ? h.bsWeak : ""}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : m.iso2)}>
                  <span className={h.bsRank}>{i + 1}</span>
                  <Flag iso2={m.iso2} name={m.name} />
                  <span className={h.bsText}>
                    <span className={h.bsName}>{m.name}{isWeakForSales(m.iso2, state.languages) ? <span className={h.bsWeakTag} title="Weak for sales: low buyer score, so few leads become sales">weak</span> : null}</span>
                    <span className={h.bsBar} aria-hidden="true">
                      <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(4, (value(m) / max) * 100)}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                    </span>
                  </span>
                  <b className={h.bsVal}>{by === "leads" ? `≈ ${leadsText(m)}` : by === "score" ? `${Math.round(value(m))}/100` : `≈ ${salesText(m)}`}</b>
                  <ChevronDown size={16} aria-hidden="true" className={`${b.bsChev} ${isOpen ? b.bsChevOpen : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && opp ? (
                    <motion.div key="more" className={b.bsMore} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                      <ul className={b.why}>
                        {opp.parts.map((x) => (
                          <li key={x.key}>
                            <span className={b.whyLabel}>
                              {x.label} <em>{Math.round(x.weight * 100)}%</em>
                            </span>
                            <span className={b.whyTrack} aria-hidden="true">
                              <span data-missing={x.score === null ? "true" : undefined} style={{ width: `${x.score ?? 40}%` }} />
                            </span>
                            <b>{x.score === null ? "no data" : Math.round(x.score)}</b>
                          </li>
                        ))}
                      </ul>
                      <p className={b.cardNote}>
                        Score {Math.round(opp.total)}/100{opp.accessFactor < 0.99 ? `, lowered ${Math.round((1 - opp.accessFactor) * 100)}% for weak capital access` : ""}. Missing data counts as a cautious 40.
                      </p>
                      <button type="button" className={b.bsChart} onClick={() => onPick(m.iso2)}>
                        Open {m.name} chart
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ol>
      </div>
      <p className={b.cardNote}>Click a market to see why it ranks here. Sales are illustrative.</p>
    </div>
  );
}
