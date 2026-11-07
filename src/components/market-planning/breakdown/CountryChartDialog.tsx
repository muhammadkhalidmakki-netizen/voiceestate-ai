"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { usePlanner } from "../planner-context";
import SettingsDialog from "../settings/SettingsDialog";
import Flag from "../settings/Flag";
import EChart from "../charts/EChart";
import { axisText, tooltipBase } from "../charts/common";
import { useChartPalette } from "../charts/palette";
import { cplSourceLabel, fmtAed, fmtCpl } from "@/lib/market-planning/format";
import { marketCoverage } from "@/lib/market-planning/coverage";
import { LANGUAGE_SEEDS } from "@/lib/market-planning/catalog";
import { uiLanguages } from "../planner-state";
import { leadsText, marketStats, salesText } from "./stats";
import { isWeakForSales } from "@/lib/market-planning/intel/dashboard";
import { opportunityOf } from "@/lib/market-planning/intel/opportunity";
import ui from "../ui.module.css";
import b from "./breakdown.module.css";

const R_OUT = 52;
const R_IN = 38;
const ring = (r: number) => 2 * Math.PI * r;

/**
 * One market, three ways: how its share of the budget compares with its share of the leads (rings), what more
 * or less budget would buy here (curve), and why it scores as it does for sales (the six dimensions).
 * Sales are illustrative: conservative leads x the one global close rate.
 */
export default function CountryChartDialog({
  iso2,
  open,
  onOpenChange,
  onBack,
}: {
  iso2: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onBack?: () => void;
}) {
  const { rows, state, openDetail } = usePlanner();
  const p = useChartPalette();
  const stats = useMemo(() => marketStats(rows, state.closeRate, state.languages), [rows, state.closeRate, state.languages]);
  const me = stats.find((m) => m.iso2 === iso2) ?? null;

  const totalSpend = stats.reduce((s, m) => s + (m.spend ?? 0), 0);
  const totalLeads = stats.reduce((s, m) => s + (m.leadsLo ?? 0), 0);
  const budgetShare = me && totalSpend > 0 ? (me.spend ?? 0) / totalSpend : 0;
  const leadsShare = me && totalLeads > 0 ? (me.leadsLo ?? 0) / totalLeads : 0;
  const verdict =
    !me || me.leadsLo === null
      ? null
      : leadsShare > budgetShare * 1.15
        ? { tone: "good", text: `Brings ${Math.round(leadsShare * 100)}% of the leads for ${Math.round(budgetShare * 100)}% of the budget: cheaper leads than your average.` }
        : leadsShare < budgetShare * 0.85
          ? { tone: "warn", text: `Brings ${Math.round(leadsShare * 100)}% of the leads for ${Math.round(budgetShare * 100)}% of the budget: dearer leads than your average.` }
          : { tone: "even", text: `Leads and budget are in step (${Math.round(budgetShare * 100)}% of each).` };

  const option = useMemo(() => {
    if (!me || !me.row.cpl || me.spend === null) return null;
    const cpl = me.row.cpl;
    const now = me.spend;
    const xMax = Math.max(1000, now * 2);
    const lo = (x: number) => x / cpl.hi;
    const hi = cpl.lo !== null ? (x: number) => x / (cpl.lo as number) : null;
    return {
      animationDuration: 500,
      grid: { left: 8, right: 14, top: 22, bottom: 8, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "axis",
        formatter: (items: Array<{ axisValue: number; value: [number, number]; seriesName: string }>) => {
          const x = items[0]?.value?.[0] ?? 0;
          const l = lo(x);
          const h = hi ? hi(x) : null;
          return `<b>${fmtAed(Math.round(x))}</b><br/>≈ ${Math.round(l)}${h === null ? "+" : h - l > 1 ? `–${Math.round(h)}` : ""} leads`;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: xMax,
        axisLabel: { ...axisText(p), formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v)) },
        axisLine: { lineStyle: { color: p.line } },
        splitLine: { show: false },
      },
      yAxis: { type: "value", axisLabel: axisText(p), splitLine: { lineStyle: { color: p.line, type: "dashed" } } },
      series: [
        {
          name: "Conservative",
          type: "line",
          showSymbol: false,
          smooth: false,
          lineStyle: { color: p.blue, width: 3 },
          areaStyle: { color: p.blue, opacity: 0.12 },
          data: [[0, 0], [xMax, lo(xMax)]],
          markPoint: {
            symbol: "circle",
            symbolSize: 14,
            itemStyle: { color: p.surface, borderColor: p.blueDeep, borderWidth: 3 },
            label: { show: false },
            data: [{ coord: [now, lo(now)] }],
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: p.blueDeep, type: "dashed", width: 1 },
            label: { formatter: "Your budget", color: p.ink3, fontSize: 11, position: "insideEndTop" },
            data: [{ xAxis: now }],
          },
        },
        ...(hi
          ? [
              {
                name: "Best case",
                type: "line",
                showSymbol: false,
                lineStyle: { color: p.blue, width: 2, type: "dashed", opacity: 0.55 },
                data: [[0, 0], [xMax, hi(xMax)]],
              },
            ]
          : []),
      ],
    };
  }, [me, p]);

  const opp = me ? opportunityOf(me.iso2) : null;
  const ranked = opp ? opp.parts.filter((x) => x.score !== null).sort((x, y) => (y.score as number) - (x.score as number)) : [];
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const missing = opp ? opp.parts.filter((x) => x.score === null).map((x) => x.label.toLowerCase()) : [];

  const cov = me ? (Object.keys(uiLanguages(state.languages)).length ? marketCoverage(me.iso2, uiLanguages(state.languages), LANGUAGE_SEEDS) : null) : null;
  const rank = me?.row.country.demandRank ?? null;

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={me ? me.name : "Market"}
      lead={me ? "How this market is doing in your plan. Sales are illustrative, with one close rate for every market." : undefined}
      footer={
        <>
          {onBack ? (
            <button type="button" className={b.btnSecondary} onClick={onBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              All markets
            </button>
          ) : null}
          {me ? (
            <button type="button" className={b.btnSecondary} onClick={() => openDetail({ kind: "country", iso2: me.iso2 })}>
              Full evidence
            </button>
          ) : null}
          <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
            Done
          </button>
        </>
      }
    >
      {me ? (
        <div className={b.country}>
          <div className={b.countryHead}>
            <Flag iso2={me.iso2} name={me.name} size={34} />
            <div>
              <p className={b.countryName}>{me.name}</p>
              <p className={b.countrySub}>
                {me.row.country.region}
                {rank !== null ? ` · #${rank} for reported Dubai property interest` : ""}
                {cov ? ` · language: ${cov.status === "full" ? "covered" : cov.status === "limited" ? "limited" : "gap"}` : ""}
              </p>
            </div>
          </div>

          <div className={b.kpis}>
            <div className={b.kpi}>
              <span className={b.kpiLabel}>Budget</span>
              <span className={b.kpiValue}>{me.spend === null ? "—" : fmtAed(Math.round(me.spend))}</span>
              <span className={b.kpiSub}>{Math.round(budgetShare * 100)}% of your budget</span>
            </div>
            <div className={b.kpi}>
              <span className={b.kpiLabel}>Estimated leads</span>
              <span className={b.kpiValue}>{me.leadsLo === null ? "Pending" : `≈ ${leadsText(me)}`}</span>
              <span className={b.kpiSub}>per month</span>
            </div>
            <div className={b.kpi}>
              <span className={b.kpiLabel}>Cost per lead</span>
              <span className={b.kpiValue}>{me.row.cpl ? fmtCpl(me.row.cpl) : "Pending"}</span>
              <span className={b.kpiSub}>{me.row.cpl ? cplSourceLabel(me.row.cpl) : "No benchmark or estimate yet"}</span>
            </div>
            <div className={b.kpi}>
              <span className={b.kpiLabel}>Sales (illustrative)</span>
              <span className={b.kpiValue}>{me.sales === null ? "—" : `≈ ${salesText(me)}`}</span>
              <span className={b.kpiSub}>{Math.round(me.closeRate * 1000) / 10}% close rate for this market</span>
            </div>
          </div>

          <div className={b.charts}>
            <section className={b.card} aria-label="Budget share against lead share">
              <h3 className={b.cardTitle}>Budget vs leads</h3>
              <div className={b.ringWrap}>
                <svg viewBox="0 0 120 120" className={b.ring} role="img" aria-label={`Budget share ${Math.round(budgetShare * 100)} percent, lead share ${Math.round(leadsShare * 100)} percent`}>
                  <circle cx="60" cy="60" r={R_OUT} className={b.ringTrack} />
                  <circle cx="60" cy="60" r={R_OUT} className={b.ringBudget} strokeDasharray={`${ring(R_OUT) * budgetShare} ${ring(R_OUT)}`} transform="rotate(-90 60 60)" />
                  <circle cx="60" cy="60" r={R_IN} className={b.ringTrack} />
                  <circle cx="60" cy="60" r={R_IN} className={b.ringLeads} strokeDasharray={`${ring(R_IN) * leadsShare} ${ring(R_IN)}`} transform="rotate(-90 60 60)" />
                  <text x="60" y="58" textAnchor="middle" className={b.ringNum}>
                    {Math.round(leadsShare * 100)}%
                  </text>
                  <text x="60" y="72" textAnchor="middle" className={b.ringCap}>
                    of leads
                  </text>
                </svg>
                <ul className={b.legend}>
                  <li>
                    <span className={b.dotBudget} /> {Math.round(budgetShare * 100)}% of budget
                  </li>
                  <li>
                    <span className={b.dotLeads} /> {Math.round(leadsShare * 100)}% of leads
                  </li>
                </ul>
              </div>
              {verdict ? <p className={`${b.verdict} ${b[`verdict_${verdict.tone}`]}`}>{verdict.text}</p> : <p className={b.verdict}>No lead estimate yet, so no comparison.</p>}
              {isWeakForSales(me.iso2, state.languages) ? <p className={`${b.verdict} ${b.verdict_bad}`}>Weak for sales: the buyer score here is low, so only about {Math.round(me.closeRate * 1000) / 10}% of its leads are expected to become sales. Cheap leads here do not mean cheap sales.</p> : null}
            </section>

            <section className={b.card} aria-label="What the budget buys here">
              <h3 className={b.cardTitle}>What budget buys here</h3>
              {option ? (
                <EChart option={option} height={190} ariaLabel={`Leads you could expect in ${me.name} at different budgets`} />
              ) : (
                <p className={b.verdict}>Add a cost per lead for this market to see the curve.</p>
              )}
              <p className={b.cardNote}>Solid line: conservative leads. Dashed: best case. Circle: your budget today.</p>
            </section>
          </div>

          {opp ? (
            <section className={b.card} aria-label={`Why ${me.name} scores as it does for sales`}>
              <h3 className={b.cardTitle}>
                Why {me.name} scores {Math.round(opp.total)}/100 for sales
              </h3>
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
              <p className={b.verdict}>
                {strongest && weakest
                  ? `Strongest: ${strongest.label.toLowerCase()} (${Math.round(strongest.score as number)}). Weakest: ${weakest.label.toLowerCase()} (${Math.round(weakest.score as number)}).`
                  : "Not enough data to say what drives this market."}
                {opp.accessFactor < 0.99 ? ` Weak capital access (controls, sanctions or currency stress) lowers the total by ${Math.round((1 - opp.accessFactor) * 100)}%.` : ""}
                {missing.length ? ` No data yet for ${missing.join(", ")}: counted as a cautious 40 and it lowers the total.` : ""}
                {opp.boost > 0 ? ` +${opp.boost} from your client results.` : ""}
              </p>
              <p className={b.cardNote}>
                Each dimension is 0 to 100. Expected sales here are about {me.sales === null ? "—" : salesText(me)} a month, from {leadsText(me)} leads at your close rate. An estimate of potential, not a count of buyers or sales.
              </p>
            </section>
          ) : null}
        </div>
      ) : (
        <p className={b.verdict}>This market is not in your plan.</p>
      )}
    </SettingsDialog>
  );
}
