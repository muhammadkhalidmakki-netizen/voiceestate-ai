"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import Flag from "../settings/Flag";
import AnimatedNumber from "../AnimatedNumber";
import { cplShort, sortStats, type MarketStat } from "./stats";
import h from "../shell/hero.module.css";
import b from "./breakdown.module.css";

type Key = "market" | "leads" | "cpl";

/** Every market with its leads and CPL. Click a heading to sort (again to flip), type to filter, click a market for its chart. */
export default function LeadsFull({ stats, onPick }: { stats: MarketStat[]; onPick: (iso2: string) => void }) {
  const [sort, setSort] = useState<{ key: Key; dir: "asc" | "desc" }>({ key: "leads", dir: "desc" });
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle ? stats.filter((m) => m.name.toLowerCase().includes(needle)) : stats;
    if (sort.key === "market") return [...base].sort((x, y) => (sort.dir === "asc" ? 1 : -1) * x.name.localeCompare(y.name));
    return sortStats(base, sort.key, sort.dir);
  }, [stats, q, sort]);
  const max = Math.max(1, ...stats.map((m) => m.leadsLo ?? 0));

  const toggle = (key: Key) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "leads" ? "desc" : "asc" }));
  const head = (key: Key, label: string, align?: "right") => {
    const on = sort.key === key;
    return (
      <button type="button" className={`${b.lfHead} ${on ? b.lfHeadOn : ""} ${align === "right" ? b.lfRight : ""}`} aria-label={`Sort by ${label}${on ? (sort.dir === "desc" ? ", highest first" : ", lowest first") : ""}`} onClick={() => toggle(key)}>
        {label}
        {on ? sort.dir === "desc" ? <ArrowDown size={13} aria-hidden="true" /> : <ArrowUp size={13} aria-hidden="true" /> : <ArrowUpDown size={12} aria-hidden="true" className={b.lfIdle} />}
      </button>
    );
  };

  return (
    <div className={b.bsFull}>
      <label className={b.lfSearch}>
        <Search size={15} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a market" aria-label="Find a market" />
      </label>
      <div className={b.lfGrid}>
        {head("market", "Market")}
        {head("leads", "Leads", "right")}
        {head("cpl", "CPL", "right")}
      </div>
      <div className={b.scrollList}>
        <ol className={h.clList}>
          {list.map((m) => (
            <motion.li key={m.iso2} layout transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <button type="button" className={`${b.lfRow}`} onClick={() => onPick(m.iso2)} title={`Open ${m.name} chart`}>
                <span className={h.clName}>
                  <Flag iso2={m.iso2} name={m.name} />
                  <span>{m.name}</span>
                </span>
                <span className={b.lfLeads}>
                  <span className={b.lfBar} aria-hidden="true">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${m.leadsLo === null ? 0 : Math.max(4, (m.leadsLo / max) * 100)}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
                  </span>
                  <b>
                    {m.leadsLo === null ? (
                      "pending"
                    ) : (
                      <>
                        <AnimatedNumber value={Math.round(m.leadsLo)} kind="int" duration={0.9} fromZero />
                        {m.leadsMore ? "+" : ""}
                      </>
                    )}
                  </b>
                </span>
                <em className={h.clCpl}>{m.row.cpl ? cplShort(m.row.cpl) : "pending"}</em>
              </button>
            </motion.li>
          ))}
          {list.length === 0 ? <li className={b.cardNote}>No market matches “{q}”.</li> : null}
        </ol>
      </div>
      <p className={b.cardNote}>CPL = cost per lead, in AED. A + means at least. Click a heading to sort.</p>
    </div>
  );
}
