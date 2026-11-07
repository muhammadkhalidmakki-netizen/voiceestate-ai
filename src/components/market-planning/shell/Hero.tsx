"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { usePlanner, type Detail } from "../planner-context";
import { LiveRange } from "../viz";
import { CoverageRing } from "../micro";
import { fmtCplRange } from "@/lib/market-planning/format";
import SalesBody from "./SalesTile";
import AnimatedNumber from "../AnimatedNumber";
import CountryLeads from "./CountryLeads";
import Flag from "../settings/Flag";
import CountryChartDialog from "../breakdown/CountryChartDialog";
import MarketBreakdownDialog from "../breakdown/MarketBreakdownDialog";
import type { SortKey } from "../breakdown/stats";
import SelectionSummary from "./SelectionSummary";
import BestSalesList from "./BestSalesList";
import { pathBottomRightNotch, pathTopRightNotch, pathTopTab, tabRange } from "./shapes";
import s from "./hero.module.css";

type Metric = Extract<Detail, { kind: "metric" }>["metric"];

function Tile({
  className,
  label,
  children,
  delay,
  shape,
  onArrow,
}: {
  className: string;
  /** Which tile this is, so its silhouette can be matched to its neighbours. */
  shape: "A" | "B" | "C" | "D";
  label: string;
  metric: Metric;
  children: React.ReactNode;
  delay: number;
  /** What the corner arrow opens. Without it there is no arrow. */
  onArrow?: () => void;
}) {
  return (
    <motion.div
      className={`${s.tileWrap} ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className={s.tile} data-tile={shape} aria-label={label}>
        <header className={s.tileHead}>
          <h2 className={s.tileLabel}>{label}</h2>
          {onArrow ? (
            <button type="button" className={s.arrow} aria-label={`${label}: open the full market breakdown`} onClick={onArrow}>
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </header>
        {children}
      </section>
    </motion.div>
  );
}

// Notch geometry (px). B loses a corner at the bottom-right; D grows a tab that fills it, one gap away.
const NOTCH = { cw: 76, ch: 34, gap: 14 };
const A_NOTCH = { cw: 70, ch: 26 };

/**
 * Draws the interlocking tile silhouettes on wide screens. B's notch and D's tab are exact
 * complements, so the gap between them stays even. Below 900px the tiles are plain rounded cards.
 */
function useInterlock(host: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const tile = (k: string) => el.querySelector<HTMLElement>(`[data-tile="${k}"]`);
    const apply = () => {
      const A = tile("A");
      const B = tile("B");
      const D = tile("D");
      const wrapD = D?.parentElement ?? null;
      const wide = window.matchMedia("(min-width: 900px)").matches;
      if (!wide || !A || !B || !D || !wrapD) {
        [A, B, D].forEach((t) => {
          if (t) {
            t.style.clipPath = "";
            t.style.removeProperty("--tab");
          }
        });
        if (wrapD) wrapD.style.marginTop = "";
        return;
      }
      // D's box rises by the notch height so its tab can reach into B's notch.
      D.style.setProperty("--tab", `${NOTCH.ch}px`);
      wrapD.style.marginTop = `-${NOTCH.ch}px`;
      A.style.clipPath = pathTopRightNotch(A.offsetWidth, A.offsetHeight, A_NOTCH.cw, A_NOTCH.ch);
      B.style.clipPath = pathBottomRightNotch(B.offsetWidth, B.offsetHeight, NOTCH.cw, NOTCH.ch);
      const { x0, x1 } = tabRange(B.offsetWidth, NOTCH);
      D.style.clipPath = pathTopTab(D.offsetWidth, D.offsetHeight, NOTCH.ch, x0, x1);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  });
}

/** The capsule chart shows the biggest markets; the rest are one click away in the breakdown. */
const MAX_BARS = 5;

export default function Hero({ countUp = true, salesTile = false }: { countUp?: boolean; salesTile?: boolean }) {
  const { plan, state, rows, pct } = usePlanner();
  const sortedRows = [...rows].sort((a, b) => b.share - a.share);
  const isBudget = state.mode === "budget";
  const tilesRef = useRef<HTMLDivElement>(null);
  useInterlock(tilesRef);
  // Popups opened from the tiles: the full breakdown, and one market's chart (with a way back to the breakdown).
  const [view, setView] = useState<null | { type: "breakdown"; sort: SortKey } | { type: "country"; iso2: string; from: "tile" | "breakdown" }>(null);
  const [lastSort, setLastSort] = useState<SortKey>("sales");
  const openBreakdown = (sort: SortKey) => {
    setLastSort(sort);
    setView({ type: "breakdown", sort });
  };
  // The sticky summary bar opens the same popups as the cards.
  useEffect(() => {
    const on = (e: Event) => {
      const w = (e as CustomEvent<string>).detail;
      if (w === "budget" || w === "leads") openBreakdown(w);
    };
    window.addEventListener("mp-open", on);
    return () => window.removeEventListener("mp-open", on);
  }, []);
  const openCountry = (iso2: string) => setView({ type: "country", iso2, from: "tile" });

  return (
    <section className={s.hero} aria-label="Plan overview">
      <div className={s.intro}>
        <motion.h1 className={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className={s.titleSoft}>Dubai Real Estate</span>
          <br />
          Market Planning
        </motion.h1>
        <p className={s.sub}>Build your buyer acquisition strategy across international markets.</p>

        <SelectionSummary countUp={countUp} />
      </div>

      <div className={s.tiles} ref={tilesRef}>
        {salesTile ? (
          <Tile shape="A" className={`${s.tA} ${s.tSales}`} label="Projected sales" metric="sales" delay={0.05}>
            <SalesBody />
          </Tile>
        ) : (
          <Tile shape="A" className={s.tA} label="Benchmark coverage" metric="coverage" delay={0.05}>
            <CoverageRing value={plan.coveredShare} label="Share of budget with a CPL benchmark" />
            <p className={s.tileFoot}>
              {plan.coveredCount} of {plan.markets.length} markets have a CPL
          </p>
        </Tile>

        )}

        <Tile shape="B" className={s.tB} label={isBudget ? "Monthly investment" : "Required investment"} metric="investment" delay={0.12} onArrow={() => openBreakdown("budget")}>
          <p className={s.value}>
            {plan.valid ? <LiveRange range={plan.budget} kind="aed" fallback="Not yet available" fromZero={countUp} /> : <span className={s.muted}>Enter a valid amount</span>}
          </p>
          <p className={s.tileFoot}>Budget share by market</p>
          <ul className={s.hb} aria-label="Share of budget per market. Select a market for its chart.">
            {sortedRows.slice(0, MAX_BARS).map((r, i) => (
              <li key={r.iso2}>
                <button type="button" className={s.hbRow} onClick={() => openCountry(r.iso2)} title={`${r.country.name}: ${pct[r.iso2] ?? 0}% of budget${r.cpl ? "" : " (CPL pending)"}`}>
                  <Flag iso2={r.iso2} name={r.country.name} />
                  <span className={s.hbName}>{r.country.name}</span>
                  <span className={s.hbTrack} aria-hidden="true">
                    <motion.span data-pending={r.cpl ? undefined : "true"} initial={{ width: 0 }} animate={{ width: `${Math.max(24, (r.share / Math.max(0.0001, sortedRows[0].share)) * 100)}%` }} transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}>
                      <i>
                        <AnimatedNumber value={(pct[r.iso2] ?? 0) / 100} kind="pct" fromZero={countUp} />
                      </i>
                    </motion.span>
                  </span>
                  <b className={s.hbVal}><AnimatedNumber value={Math.round(r.spend.hi ?? r.spend.lo ?? 0)} kind="int" fromZero={countUp} /></b>
                </button>
              </li>
            ))}
          </ul>
          {sortedRows.length > MAX_BARS ? (
            <button type="button" className={s.invMore} onClick={() => openBreakdown("budget")}>
              +{sortedRows.length - MAX_BARS} more markets · See the full breakdown
            </button>
          ) : null}
        </Tile>

        <Tile shape="C" className={s.tC} label={isBudget ? "Estimated leads" : "Lead target"} metric="leads" delay={0.19} onArrow={() => openBreakdown("leads")}>
          <p className={s.value}>
            {plan.valid ? <LiveRange range={plan.leads} kind="leads" fallback="Not yet validated" fromZero={countUp} /> : <span className={s.muted}>—</span>}
          </p>
          <p className={s.avgCpl}>
            Average cost per lead <b>{plan.valid ? (fmtCplRange(plan.blendedCpl) ? fmtCplRange(plan.blendedCpl) : "not yet available") : "—"}</b>
          </p>
          <CountryLeads onOpenCountry={openCountry} onOpenAll={() => openBreakdown("leads")} />
        </Tile>

        <Tile shape="D" className={s.tD} label="Best markets for sales" metric="sales" delay={0.26} onArrow={() => openBreakdown("sales")}>
          <BestSalesList onOpenCountry={openCountry} onOpenAll={() => openBreakdown("sales")} />
        </Tile>
      </div>

      <MarketBreakdownDialog
        open={view?.type === "breakdown"}
        onOpenChange={(o) => !o && setView(null)}
        initialSort={view?.type === "breakdown" ? view.sort : lastSort}
        onPick={(iso2) => setView({ type: "country", iso2, from: "breakdown" })}
      />
      <CountryChartDialog
        open={view?.type === "country"}
        iso2={view?.type === "country" ? view.iso2 : null}
        onOpenChange={(o) => !o && setView(null)}
        onBack={view?.type === "country" && view.from === "breakdown" ? () => setView({ type: "breakdown", sort: lastSort }) : undefined}
      />
    </section>
  );
}
