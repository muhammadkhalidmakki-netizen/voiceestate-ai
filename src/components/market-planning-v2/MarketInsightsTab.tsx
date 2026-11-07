"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { usePlanner } from "../market-planning/planner-context";
import Flag from "../market-planning/settings/Flag";
import FocusMap, { VERDICT_FILL } from "./FocusMap";
import CountryChartDialog from "../market-planning/breakdown/CountryChartDialog";
import { cplShort, leadsText, marketStats, salesText, type MarketStat } from "../market-planning/breakdown/stats";
import { fmtAed } from "@/lib/market-planning/format";
import { WEAK_MULT, closeRateMultiplier, languageReach, type LanguageReach } from "@/lib/market-planning/intel/dashboard";
import v from "./v2.module.css";
import h from "./insights-home.module.css";

type Enriched = MarketStat & {
  region: string;
  buyer: number | null;
  reach: LanguageReach;
  perThousand: number | null;
  weak: boolean;
  /** 0..100: value for money, buyer quality and language reach combined. */
  fit: number;
  value: number;
};

function useEnriched(): Enriched[] {
  const { rows, state } = usePlanner();
  return useMemo(() => {
    const stats = marketStats(rows, state.closeRate, state.languages);
    const base = stats.map((m) => {
      const spend = m.spend ?? 0;
      return {
        m,
        buyer: m.quality === null ? null : Math.round(m.quality * 100),
        reach: languageReach(m.iso2, state.languages),
        perThousand: m.sales !== null && spend > 0 ? (m.sales / spend) * 1000 : null,
        weak: closeRateMultiplier(m.iso2, state.languages) < WEAK_MULT,
      };
    });
    const maxPer = Math.max(0.0001, ...base.map((b) => b.perThousand ?? 0));
    return base.map((b) => {
      const value = b.perThousand === null ? 0 : Math.round((b.perThousand / maxPer) * 100);
      const fit = Math.round(0.5 * value + 0.3 * (b.buyer ?? 40) + 0.2 * b.reach.score * 100);
      return { ...b.m, region: b.m.row.country.region, buyer: b.buyer, reach: b.reach, perThousand: b.perThousand, weak: b.weak, fit, value };
    });
  }, [rows, state.closeRate, state.languages]);
}

/* ------------------------------------------------------------------ Which market is best for you */

const word = (n: number) => (n >= 70 ? "Great" : n >= 45 ? "Good" : n >= 25 ? "Fair" : "Low");
const tone = (n: number) => (n >= 70 ? "good" : n >= 45 ? "ok" : "low");

function verdict(m: Enriched, rank: number): { label: string; kind: "best" | "strong" | "good" | "ok" | "weak" } {
  if (m.weak) return { label: "Weak for sales", kind: "weak" };
  if (rank === 0) return { label: "Best match", kind: "best" };
  if (m.fit >= 70) return { label: "Strong pick", kind: "strong" };
  if (m.fit >= 50) return { label: "Good option", kind: "good" };
  return { label: "Only okay", kind: "ok" };
}

function Meter({ label, value, text }: { label: string; value: number; text: string }) {
  return (
    <div className={h.meter}>
      <div className={h.meterTop}>
        <span>{label}</span>
        <b className={h[`t_${tone(value)}`]}>{text}</b>
      </div>
      <span className={h.meterTrack} aria-hidden="true">
        <motion.span className={h[`bar_${tone(value)}`]} initial={{ width: 0 }} animate={{ width: `${Math.max(4, value)}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </span>
    </div>
  );
}

const rankOrder = (all: Enriched[]) => [...all].sort((a, b) => (b.perThousand === null ? -1 : a.perThousand === null ? 1 : b.fit - a.fit));

/** The comparison verdict of every market, so the map can colour the same way the comparison cards do. */
function verdictMap(all: Enriched[]): Record<string, { kind: "best" | "strong" | "good" | "ok" | "weak"; label: string }> {
  const out: Record<string, { kind: "best" | "strong" | "good" | "ok" | "weak"; label: string }> = {};
  rankOrder(all).forEach((m, i) => {
    out[m.iso2] = verdict(m, i);
  });
  return out;
}

function BestForYou({ onPick }: { onPick: (iso2: string) => void }) {
  const all = useEnriched();
  const ranked = useMemo(() => rankOrder(all), [all]);
  if (ranked.length === 0) return null;
  const best = ranked[0];

  const sentence = (m: Enriched): string => {
    const parts = [
      { k: "value for money", n: m.value },
      { k: "buyer quality", n: m.buyer ?? 40 },
      { k: "language reach", n: Math.round(m.reach.score * 100) },
    ].sort((a, b) => b.n - a.n);
    const top = parts[0];
    const low = parts[2];
    return m.weak
      ? "Few leads from here turn into sales, even when they are cheap."
      : low.n < 40 && top.n - low.n > 25
        ? `Best at ${top.k}. Weakest at ${low.k}.`
        : top.n >= 70
          ? `Strong on ${top.k}.`
          : "A balanced option without a standout strength.";
  };

  return (
    <section className={v.card} aria-labelledby="mi-best">
      <div className={v.cardHead}>
        <div>
          <h2 id="mi-best" className={v.cardTitle}>Market comparison</h2>
          <p className={v.cardSub}>
            {ranked.length > 1 ? `${best.name} comes first for your budget. ` : ""}Tap a market for the full picture. Sales are illustrative.
          </p>
        </div>
      </div>

      <ol className={h.cards}>
        {ranked.map((m, i) => {
          const vd = verdict(m, i);
          const spendText = m.spend === null ? "" : fmtAed(Math.round(m.spend));
          return (
            <li key={m.iso2}>
              <button type="button" className={`${h.pick} ${h[`pick_${vd.kind}`]}`} style={{ ["--rc" as string]: VERDICT_FILL[vd.kind] }} onClick={() => onPick(m.iso2)} aria-label={`${m.name}: ${vd.label}, fit score ${m.fit} out of 100. Open details.`}>
                <span className={h.pickTop}>
                  <span className={h.rankNum}>{i + 1}</span>
                  <Flag iso2={m.iso2} name={m.name} size={26} />
                  <span className={h.pickName}>{m.name}</span>
                </span>
                <span className={h.ringRow}>
                  <span className={h.ring} style={{ ["--p" as string]: `${m.fit}` }} aria-hidden="true">
                    <b>{m.fit}</b>
                  </span>
                  <span className={h.ringText}>
                    <span className={`${h.verdict} ${h[`v_${vd.kind}`]}`}>{vd.label}</span>
                    <small>{sentence(m)}</small>
                  </span>
                </span>
                <Meter label="Value for money" value={m.value} text={word(m.value)} />
                <Meter label="Buyer quality" value={m.buyer ?? 0} text={m.buyer === null ? "Unknown" : word(m.buyer)} />
                <Meter label="Language reach" value={Math.round(m.reach.score * 100)} text={m.reach.level === "nodata" ? "No data" : word(m.reach.score * 100)} />
                <span className={h.facts}>
                  <span><b>{m.row.cpl ? `AED ${cplShort(m.row.cpl)}` : "Pending"}</b> per lead</span>
                  <span><b>{m.leadsLo === null ? "—" : `≈ ${leadsText(m)}`}</b> leads</span>
                  <span><b>{m.sales === null ? "—" : `≈ ${salesText(m)}`}</b> sales</span>
                  {spendText ? <span>of <b>{spendText}</b> budget</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className={h.note}>
        The score (0 to 100) mixes value for money (half), buyer quality (30%) and how well your languages reach the country (20%). Value for money is the sales you can expect for each AED spent, compared with your other markets.
      </p>
    </section>
  );
}

const GROUPS: Array<["best" | "strong" | "good" | "ok" | "weak", string]> = [["best", "Best match"], ["strong", "Strong picks"], ["good", "Good options"], ["ok", "Only okay"], ["weak", "Weak for sales"]];

/* ------------------------------------------------------------------ Market breakdown table */

type SortKey = "market" | "share" | "spend" | "cpl" | "leads" | "sales" | "close" | "buyer" | "reach";
const REACH_TEXT = { strong: "Strong", partial: "Partial", limited: "Limited", low: "Low", nodata: "No data" } as const;

function BreakdownTable({ onPick }: { onPick: (iso2: string) => void }) {
  const { pct } = usePlanner();
  const all = useEnriched();
  const [q, setQ] = useState("");
  const verdicts = useMemo(() => verdictMap(all), [all]);
  const [chip, setChip] = useState<"all" | "best" | "strong" | "good" | "ok" | "weak">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "share", dir: "desc" });

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let l = all.filter((m) => (!needle || m.name.toLowerCase().includes(needle) || m.region.toLowerCase().includes(needle)) && (chip === "all" || verdicts[m.iso2]?.kind === chip));
    const val = (m: Enriched): number | string | null =>
      sort.key === "market" ? m.name : sort.key === "share" ? m.share : sort.key === "spend" ? m.spend : sort.key === "cpl" ? m.cplMid : sort.key === "leads" ? m.leadsLo : sort.key === "sales" ? m.sales : sort.key === "close" ? m.closeRate : sort.key === "buyer" ? m.buyer : m.reach.score;
    const sign = sort.dir === "asc" ? 1 : -1;
    l = [...l].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number)) * sign;
    });
    return l;
  }, [all, q, chip, sort, verdicts]);

  const toggle = (key: SortKey) => setSort((c) => (c.key === key ? { key, dir: c.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "market" || key === "cpl" ? "asc" : "desc" }));
  const th = (key: SortKey, label: string, right = true) => {
    const on = sort.key === key;
    return (
      <th scope="col" className={right ? h.right : undefined}>
        <button type="button" className={`${h.thBtn} ${on ? h.thOn : ""}`} aria-label={`Sort by ${label}`} onClick={() => toggle(key)}>
          {label}
          {on ? sort.dir === "desc" ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" /> : <ArrowUpDown size={11} aria-hidden="true" className={h.idle} />}
        </button>
      </th>
    );
  };

  return (
    <section className={v.card} aria-labelledby="mi-table">
      <div className={v.cardHead}>
        <div>
          <h2 id="mi-table" className={v.cardTitle}>Market breakdown</h2>
          <p className={v.cardSub}>Every market in your plan. Tap a heading to sort, a row for details.</p>
        </div>
      </div>

      <div className={h.tools}>
        <label className={h.search}>
          <Search size={15} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a market or region" aria-label="Find a market or region" />
          {q ? (
            <button type="button" className={h.clear} aria-label="Clear search" onClick={() => setQ("")}>
              <X size={13} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className={h.chips} role="group" aria-label="Filter markets">
          <button type="button" className={`${h.chipBtn} ${chip === "all" ? h.chipOn : ""}`} aria-pressed={chip === "all"} onClick={() => setChip("all")}>
            All ({all.length})
          </button>
          {GROUPS.map(([kind, label]) => {
            const n = all.filter((m) => verdicts[m.iso2]?.kind === kind).length;
            if (n === 0) return null;
            return (
              <button key={kind} type="button" className={`${h.chipBtn} ${h.chipVerdict} ${chip === kind ? h.chipVerdictOn : ""}`} style={{ ["--vc" as string]: VERDICT_FILL[kind] }} aria-pressed={chip === kind} onClick={() => setChip(kind)}>
                <span className={h.chipSwatch} aria-hidden="true" />
                {label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      <div className={h.tableWrap}>
        <table className={h.table}>
          <thead>
            <tr>
              {th("market", "Market", false)}
              {th("share", "Share")}
              {th("spend", "Budget")}
              {th("cpl", "CPL")}
              {th("leads", "Leads")}
              {th("sales", "Sales*")}
              {th("close", "Close")}
              {th("reach", "Language")}
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.iso2} className={`${h.tr} ${verdicts[m.iso2]?.kind === "weak" ? h.trTint : ""}`} style={{ ["--vc" as string]: VERDICT_FILL.weak }} onClick={() => onPick(m.iso2)}>
                <td>
                  <span className={h.nameCell}>
                    <Flag iso2={m.iso2} name={m.name} size={22} />
                    <span>
                      <b>{m.name}</b>
                      <small>{m.region} · {verdicts[m.iso2]?.label}</small>
                    </span>
                  </span>
                </td>
                <td className={h.right}>{pct[m.iso2] ?? 0}%</td>
                <td className={h.right}>{m.spend === null ? "—" : fmtAed(Math.round(m.spend))}</td>
                <td className={h.right}>{m.row.cpl ? cplShort(m.row.cpl) : "Pending"}</td>
                <td className={h.right}>{m.leadsLo === null ? "—" : leadsText(m)}</td>
                <td className={h.right}>{m.sales === null ? "—" : salesText(m)}</td>
                <td className={h.right}>{(Math.round(m.closeRate * 1000) / 10).toFixed(1)}%</td>
                <td className={h.right}><span className={`${h.reachTag} ${h[`reach_${m.reach.level}`]}`} title="Language reach: how well your selected languages reach this country">{REACH_TEXT[m.reach.level]}</span></td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={8} className={h.empty}>No market matches.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className={h.note}>CPL in AED, adjusted for your languages. *Sales are illustrative: leads times each market&rsquo;s own close rate.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ Where your markets are */


function MapPanel({ onOpen }: { onOpen: (iso2: string) => void }) {
  const { rows, pct } = usePlanner();
  const all = useEnriched();
  const [focus, setFocus] = useState<string | null>(null);
  const top = useMemo(() => [...rows].sort((a, b) => b.share - a.share), [rows]);
  const sel = all.find((m) => m.iso2 === focus) ?? null;
  const verdicts = useMemo(() => verdictMap(all), [all]);
  return (
    <section className={v.card} aria-labelledby="mi-map">
      <div className={v.cardHead}>
        <div>
          <h2 id="mi-map" className={v.cardTitle}>Where your markets are</h2>
          <p className={v.cardSub}>Colour shows how good each market is for you. Tap a market to zoom in; drag and scroll to explore.</p>
        </div>
      </div>
      <FocusMap focus={focus} onFocus={setFocus} verdicts={verdicts} />
      {sel ? (
        <div className={h.mapInfo}>
          <Flag iso2={sel.iso2} name={sel.name} size={28} />
          <div className={h.mapInfoText}>
            <b>
              {sel.name}
              {verdicts[sel.iso2] ? <span className={`${h.verdict} ${h[`v_${verdicts[sel.iso2].kind}`]} ${h.inlineVerdict}`}>{verdicts[sel.iso2].label}</span> : null}
            </b>
            <span>
              {pct[sel.iso2] ?? 0}% of your budget{sel.spend === null ? "" : ` · ${fmtAed(Math.round(sel.spend))}`}
              {sel.leadsLo === null ? "" : ` · ≈ ${leadsText(sel)} leads`}
              {sel.sales === null ? "" : ` · ≈ ${salesText(sel)} sales`}
            </span>
          </div>
          <button type="button" className={h.mapInfoBtn} onClick={() => onOpen(sel.iso2)}>
            Full details
          </button>
        </div>
      ) : null}
      <div className={h.groups}>
        {GROUPS.map(([kind, label]) => {
          const list = top.filter((r) => (verdicts[r.iso2]?.kind ?? "ok") === kind);
          if (!list.length) return null;
          return (
            <div key={kind} className={h.group}>
              <div className={h.groupHead}>
                <span className={h.groupDot} style={{ background: VERDICT_FILL[kind] }} aria-hidden="true" />
                <b>{label}</b>
              </div>
              <ul className={h.mapList} aria-label={label}>
                {list.map((r) => (
                  <li key={r.iso2}>
                    <button type="button" className={`${h.mapChip} ${focus === r.iso2 ? h.mapChipOn : ""}`} aria-pressed={focus === r.iso2} onClick={() => setFocus(focus === r.iso2 ? null : r.iso2)}>
                      <Flag iso2={r.iso2} name={r.country.name} size={18} />
                      <span>{r.country.name}</span>
                      <b>{pct[r.iso2] ?? 0}%</b>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Tab 1: every market in a table, and where they are on the map. */
export function MarketBreakdownTab() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className={v.stack}>
      <div className={h.split}>
        <BreakdownTable onPick={setPicked} />
        <MapPanel onOpen={setPicked} />
      </div>
      <CountryChartDialog iso2={picked} open={picked !== null} onOpenChange={(o) => !o && setPicked(null)} />
    </div>
  );
}

/** Tab 2: the selected markets side by side, best first. */
export function MarketComparisonTab() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className={v.stack}>
      <BestForYou onPick={setPicked} />
      <CountryChartDialog iso2={picked} open={picked !== null} onOpenChange={(o) => !o && setPicked(null)} />
    </div>
  );
}
