"use client";

import { PanelHead, EvidencePill } from "../ui";
import { SALES_CYCLE } from "@/lib/market-planning/catalog";
import { rampColor } from "../viz";
import SalesCurve from "../charts/SalesCurve";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

type Col = { key: string; axis: string; cumulative: number; count: number; tail?: boolean };

export default function SalesTimeline() {
  const sample = SALES_CYCLE.sample_size;
  const cps = SALES_CYCLE.checkpoints;
  const tail = SALES_CYCLE.long_tail;

  const cols: Col[] = [
    ...cps.map((c) => ({ key: `d${c.day}`, axis: `${c.day} days`, cumulative: c.share_percent, count: c.count })),
    { key: "tail", axis: `${tail.from_month}–${tail.to_month} months`, cumulative: 100, count: sample, tail: true },
  ];
  // Incremental counts per interval, for the dot matrix.
  const buckets = cols.map((c, i) => ({
    key: c.key,
    label: c.tail ? `${tail.from_month}–${tail.to_month} months` : i === 0 ? "By day 30" : `Day ${cps[i - 1].day + 1}–${cps[i].day}`,
    n: c.count - (i === 0 ? 0 : cols[i - 1].count),
  }));

  return (
    <section className={ui.panel} id="timeline" aria-labelledby="timeline-title">
      <PanelHead
        id="timeline-title"
        title="When your pipeline may mature"
        copy="Property enquiries rarely turn into completed sales on the day they arrive. These historical observations show how long the sales journey has taken, which helps set expectations for the time between lead generation and a potential close."
        right={<EvidencePill kind="client" label="Client data · 19 cases" />}
      />

      <SalesCurve />
      <p className={ui.subtle} style={{ margin: "4px 2px 0" }}>
        Cumulative share of the historical cases by checkpoint. Checkpoints are not evenly spaced in time, and the
        dashed, hatched segment is the long tail added on top of the 270-day figure.
      </p>

      <div className={f.dots} role="img" aria-label={`${sample} historical cases by closing window`}>
        {buckets.flatMap((b, bi) =>
          Array.from({ length: b.n }, (_, k) => (
            <span key={`${b.key}-${k}`} className={f.dot} style={{ background: rampColor(bi) }} />
          )),
        )}
      </div>
      <ul className={f.dotLegend}>
        {buckets.map((b, bi) => (
          <li key={b.key}>
            <span className={f.swatch} style={{ background: rampColor(bi) }} />
            {b.label}: {b.n}
          </li>
        ))}
      </ul>

      <dl className={f.stats}>
        <div className={f.stat}>
          <dt>Median time to sale</dt>
          <dd>{SALES_CYCLE.median_days} days</dd>
        </div>
        <div className={f.stat}>
          <dt>Historical sample</dt>
          <dd>{sample} cases</dd>
        </div>
        <div className={f.stat}>
          <dt>Long tail</dt>
          <dd>
            {tail.from_month}–{tail.to_month} mo
          </dd>
        </div>
      </dl>

      <div className={`${ui.callout} ${ui.calloutAmber}`} style={{ marginTop: 14 }}>
        <span>
          <strong>Historical timing observation from {sample} anonymized cases.</strong> The denominator is not
          yet confirmed: these figures may describe how long deals that did close took, or the share of all
          original leads that converted. They do not estimate the number or probability of sales from your
          planned leads.
        </span>
      </div>
      <div className={f.locked}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: "none" }}>
          <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span>
          Projected sales are switched off until the sample denominator and the working-lead rate definitions
          are confirmed.
        </span>
      </div>
    </section>
  );
}
