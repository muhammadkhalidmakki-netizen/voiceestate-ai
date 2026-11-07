"use client";

import { PanelHead, EvidencePill } from "../ui";
import { usePlanner } from "../planner-context";
import { MeterRow } from "../viz";
import { LEARNING_CPL, cplProvenance } from "@/lib/market-planning/catalog";
import { fmtAed, fmtCpl, fmtInt, fmtOne, fmtPct } from "@/lib/market-planning/format";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

export default function MaturityPanel() {
  const { plan, rows } = usePlanner();
  const m = plan.maturity;

  // One line per client benchmark region in the plan: is a learning benchmark supplied?
  const regionMap = new Map<string, { label: string; mature: string; learning: number | null; share: number }>();
  for (const r of rows) {
    const key = r.country.benchmarkRegion ?? "No client benchmark";
    const cur = regionMap.get(key) ?? {
      label: key,
      mature: r.cpl ? fmtCpl(r.cpl) : "Research pending",
      learning: LEARNING_CPL[r.iso2] ?? null,
      share: 0,
    };
    cur.share += r.share;
    regionMap.set(key, cur);
  }
  const regions = [...regionMap.values()].sort((a, b) => b.share - a.share);
  const maxLeads = m ? Math.max(m.leadsLearning, m.leadsMature) : 1;

  return (
    <section className={ui.panel} id="maturity" aria-labelledby="maturity-title">
      <PanelHead
        id="maturity-title"
        title="Campaign performance scenarios"
        copy="New campaigns can need a higher acquisition cost while the platform and team learn. Where both benchmarks exist, the learning-phase plan is compared with the mature-campaign reference automatically."
        right={<EvidencePill kind="client" />}
      />

      {m && plan.valid ? (
        <>
          <p className={ui.subtle} style={{ margin: "0 0 12px" }}>
            Europe markets in your plan ({fmtPct(m.sliceShare)} of the budget). Same budget in both columns, so
            you can see what the cost difference means.
          </p>
          <div className={f.maturity}>
            <div className={f.mCol}>
              <p className={f.mTitle}>New / learning campaigns</p>
              <p className={f.mCpl}>{fmtAed(m.learningCpl)}</p>
              <p className={f.mCplLabel}>Learning-phase CPL benchmark</p>
              <dl className={f.mStats}>
                <div>
                  <dt>Estimated leads for {fmtAed(m.sliceBudget)}</dt>
                  <dd>≈ {fmtInt(m.leadsLearning)}</dd>
                  <MeterRow label="" value={m.leadsLearning} max={maxLeads} display="" tone="soft" />
                </div>
                <div>
                  <dt>Investment for {fmtInt(m.leadsMature)} leads</dt>
                  <dd>{fmtAed(m.investmentLearning)}</dd>
                </div>
              </dl>
            </div>
            <div className={`${f.mCol} ${f.mColMature}`}>
              <p className={f.mTitle}>Mature campaigns</p>
              <p className={f.mCpl}>{fmtAed(m.matureCpl)}</p>
              <p className={f.mCplLabel}>Mature CPL benchmark</p>
              <dl className={f.mStats}>
                <div>
                  <dt>Estimated leads for {fmtAed(m.sliceBudget)}</dt>
                  <dd>≈ {fmtInt(m.leadsMature)}</dd>
                  <MeterRow label="" value={m.leadsMature} max={maxLeads} display="" tone="navy" />
                </div>
                <div>
                  <dt>Investment for {fmtInt(m.leadsMature)} leads</dt>
                  <dd>{fmtAed(m.investmentMature)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className={f.reduction}>
            <span className={f.reductionNum}>{fmtOne(m.reduction * 100)}%</span>
            <span>
              Illustrative benchmark reduction: the arithmetic difference between {fmtAed(m.learningCpl)} and{" "}
              {fmtAed(m.matureCpl)}. It is not a guaranteed improvement and not a prediction of how long
              maturity takes.
            </span>
          </div>
        </>
      ) : (
        <p className={f.invalid}>
          {plan.valid
            ? "No selected market has a supplied learning-phase benchmark. Add a European market (Switzerland, Germany, France, Luxembourg, the Netherlands or Norway) to see the learning versus mature comparison."
            : "Enter a valid budget or lead target to compare scenarios."}
        </p>
      )}

      <div className={f.subhead} style={{ marginTop: 20 }}>
        <h3 className={f.h3}>Learning-phase coverage in your plan</h3>
      </div>
      <ul className={f.benchTable}>
        {regions.map((r) => (
          <li key={r.label} className={f.benchRow}>
            <span>
              <strong>{r.label}</strong> · {fmtPct(r.share)} of budget
              <br />
              <span className={ui.subtle}>Mature reference: {r.mature}</span>
            </span>
            {r.learning !== null ? (
              <EvidencePill kind="client" label={`Learning ${fmtAed(r.learning)}`} />
            ) : (
              <span style={{ alignSelf: "center" }}>
                <EvidencePill kind="pending" label="Learning benchmark not yet supplied" />
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className={ui.subtle} style={{ margin: "10px 2px 0" }}>
        Only Europe has a learning-phase value. It is not copied to other regions or scaled from the 120 / 50
        ratio. {cplProvenance("FR")?.scopeNote}
      </p>
    </section>
  );
}
