"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { usePlanner } from "../planner-context";
import AnimatedNumber from "../AnimatedNumber";
import { MonthBars } from "../micro";
import { SALES_CYCLE } from "@/lib/market-planning/catalog";
import { WEAK_MULT, isWeakForSales, marketCloseRate } from "@/lib/market-planning/intel/dashboard";
import { batchSaleDays, monthlyTimingShares } from "@/lib/market-planning/sales";
import { fmtInt } from "@/lib/market-planning/format";
import { portalContainer } from "./theme";
import s from "./hero.module.css";

/** 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st. */
function ord(n: number): string {
  const r100 = n % 100;
  if (r100 >= 11 && r100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
// Every sale the plan expects is listed (at least four rows, so a small budget shows what it still needs).
const MAX_SALES = 40;
// The historical timing runs out at 26 months. The tile shows the first 12; a button opens all 26.
const MONTHS = 26;
const SHOWN = 12;

/** Up to about four months a time reads in days, otherwise in months. */
const asParts = (days: number) =>
  days < 120 ? { value: days, kind: "int" as const, unit: "days" } : { value: days / 30, kind: "dec1" as const, unit: "months" };

function Duration({ days }: { days: number }) {
  const p = asParts(days);
  return (
    <>
      <AnimatedNumber value={p.value} kind={p.kind} fromZero /> {p.unit}
    </>
  );
}

/**
 * Body of the "Projected sales" tile. It follows ONE month of leads (a batch) from the day the
 * leads arrive, using the historical timing as a provisional shape. The same budget is spent every
 * month, so every month starts a new batch and the pattern repeats.
 */
export default function SalesBody() {
  const { plan, state, rows, effectiveCloseRate } = usePlanner();
  // Few sales because the markets are weak buyers (not just a small budget): say so instead of "needs more leads".
  const weak = effectiveCloseRate < state.closeRate * WEAK_MULT;
  // In a mixed plan the whole plan is not weak, but a weak market inside it should not hide.
  const weakMarkets = weak ? [] : rows.filter((r) => isWeakForSales(r.iso2, state.languages));
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = (e: Event) => (e as CustomEvent<string>).detail === "sales" && setFull(true);
    window.addEventListener("mp-open", on);
    return () => window.removeEventListener("mp-open", on);
  }, []);
  const leads = plan.valid ? plan.leads.lo : null;
  const eventual = leads !== null ? leads * effectiveCloseRate : null;
  const open = plan.leads.hi === null; // upper bound unknown: show "+"
  const shares = useMemo(() => monthlyTimingShares(SALES_CYCLE.checkpoints, SALES_CYCLE.long_tail, 26), []);

  const model = useMemo(() => {
    if (eventual === null || !state.timingProvisional) return null;
    // The chart and "Total sales" follow ONE month of leads (a batch), as before.
    const perMonth = shares.slice(0, MONTHS).map((sh) => eventual * sh);
    let run = 0;
    const cumulative = perMonth.map((v) => (run += v));
    const all = batchSaleDays(eventual, SALES_CYCLE.checkpoints, SALES_CYCLE.long_tail, Math.max(4, Math.min(MAX_SALES, Math.floor(eventual + 0.3))), SALES_CYCLE.median_days);
    const steps = all;
    // Which sales land in which month.
    const byMonth: number[][] = Array.from({ length: MONTHS }, () => []);
    for (const st of all) {
      if (st.days === null || st.days > MONTHS * 30) continue;
      byMonth[Math.max(0, Math.ceil(st.days / 30) - 1)].push(st.k);
    }
    const flagged = byMonth.filter((k) => k.length > 0).length;
    const name = ord;
    const flags = byMonth.map((ks) => {
      if (ks.length === 0) return null;
      if (flagged > 2) return ks.length === 1 ? `#${ks[0]}` : `#${ks[0]}–${ks[ks.length - 1]}`;
      if (ks.length === 1) return flagged === 1 ? `${name(ks[0])} sale` : name(ks[0]);
      return `${name(ks[0])}–${name(ks[ks.length - 1])}`;
    });
    return { perMonth, cumulative, steps, firstDay: steps[0].days, flags };
  }, [eventual, state.timingProvisional, shares]);

  if (leads === null || eventual === null) {
    return <p className={s.pendingBox}>Not yet validated. Add a market with a CPL benchmark and a valid budget.</p>;
  }
  if (!model) {
    return (
      <>
        <p className={s.value}>
          ≈ <AnimatedNumber value={eventual} kind="dec1" fromZero /> <span className={s.muted}>sales per month of budget</span>
        </p>
        <p className={s.pendingBox}>Provisional timing is off, so no dates are shown. Turn it on to see when sales could land.</p>
      </>
    );
  }

  const { perMonth, cumulative, steps, firstDay, flags } = model;
  const parts = firstDay === null ? null : asParts(firstDay);
  const maxTotal = Math.max(cumulative[cumulative.length - 1], 0.0001);
  const details = perMonth.map((v, i) => ({
    label: String(i + 1),
    title: `By the end of month ${i + 1}`,
    month: i + 1,
    closes: v,
    total: cumulative[i],
    share: v / eventual,
    eventual,
  }));

  return (
    <>
      <div className={s.saleStats}>
        <div className={s.saleStat}>
          <span className={s.saleLabel}>First sale in about</span>
          <span className={s.saleBig}>
            {parts === null ? (
              <span className={`${s.saleNeeds} ${weak ? s.saleWeak : ""}`}>{weak ? "Weak market" : "Needs more leads"}</span>
            ) : (
              <>
                <AnimatedNumber value={parts.value} kind={parts.kind} fromZero />
                <small>{parts.unit}</small>
              </>
            )}
          </span>
        </div>
        <div className={s.saleStat}>
          <span className={s.saleLabel}>Total sales</span>
          <span className={s.saleBig}>
            <span>
              ≈ <AnimatedNumber value={eventual} kind="dec1" fromZero />
              {open ? "+" : ""}
            </span>
          </span>
          <span className={s.saleRate} title="Each market has its own close rate from its buyer score. This is the blended rate for your markets.">
            at <AnimatedNumber value={effectiveCloseRate} kind="pct1" fromZero /> close rate
          </span>
        </div>
      </div>
      <span className={s.saleSub}>
        From each month&rsquo;s budget (≈ {fmtInt(leads)}
        {open ? "+" : ""} leads). You spend it every month, so this repeats every month.
      </span>

      <div>
        <MonthBars
          values={cumulative.slice(0, SHOWN).map((v) => v / maxTotal)}
          details={details.slice(0, SHOWN)}
          flags={flags.slice(0, SHOWN)}
          more={{ label: "13+", title: "Open the full 26-month chart", onClick: () => setFull(true) }}
        />
        <p className={s.chartCaption}>
<strong>Sales so far</strong>, month by month after the leads arrive. Flags show the month each sale is reached. Tap <strong>13+</strong> for the full chart.
        </p>
      </div>

      <ol className={s.timeline} aria-label="Projected order of sales">
        {steps.map((st, i) => (
          <li key={st.k} className={s.tlItem}>
            <span className={`${s.tlDot} ${i === 0 ? s.tlDotFirst : ""}`} aria-hidden="true">
              {st.k}
            </span>
            <span className={s.tlName}>{ord(st.k)} sale</span>
            <span className={s.tlWhen}>
              {st.days === null ? (
                <span className={weak ? s.weakText : s.muted}>{weak ? "weak market" : "needs more leads"}</span>
              ) : (
                <>≈ <Duration days={st.days} /></>
              )}
            </span>
          </li>
        ))}
      </ol>

      {weakMarkets.length > 0 ? (
        <p className={s.weakNote}>
          Includes {weakMarkets.length === 1 ? "a weak market" : "weak markets"}:{" "}
          {weakMarkets.map((r) => `${r.country.name} (about ${Math.round(marketCloseRate(r.iso2, state.closeRate, state.languages) * 1000) / 10}% close rate)`).join(", ")}. Their leads add few sales.
        </p>
      ) : null}

      <p className={s.tileFoot}>
        Illustrative: about {Math.round(effectiveCloseRate * 1000) / 10}% close rate for your markets (it varies by market) and provisional timing. Not a promise.
      </p>

      <Dialog.Root open={full} onOpenChange={setFull}>
        <Dialog.Portal container={full ? portalContainer() : undefined}>
          <Dialog.Overlay className={s.dlgOverlay} />
          <Dialog.Content className={s.dlg} aria-describedby={undefined}>
            <div className={s.dlgHead}>
              <Dialog.Title className={s.dlgTitle}>Sales so far, all 26 months</Dialog.Title>
              <Dialog.Close className={s.dlgClose} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className={s.dlgBody}>
              <p className={s.dlgLead}>
                From each month&rsquo;s budget (≈ {fmtInt(leads)}{open ? "+" : ""} leads) you could get about <strong>{eventual.toFixed(1)}{open ? "+" : ""} sales</strong>.
                Most arrive early: by month 9 you are at about <strong>{cumulative[8].toFixed(1)}</strong>. The last few trickle in
                until month 26.
              </p>
              <MonthBars values={cumulative.map((v) => v / maxTotal)} details={details} flags={flags} tall />
              <p className={s.chartCaption}>
                Flags show the month each sale is reached. The 1st sale is about {parts ? `${Math.round(firstDay as number)} days` : "—"}. The 1st sale is dated at the typical {SALES_CYCLE.median_days} days, whatever the budget. The others are spread out up to about 9 months. The last few sales take anywhere from 9 to 26 months and can&rsquo;t be dated.
              </p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
