"use client";

import { PanelHead, EvidencePill } from "../ui";
import { usePlanner } from "../planner-context";
import { SplitBar, rampColor } from "../viz";
import LeadsCurve from "../charts/LeadsCurve";
import RegionBars from "../charts/RegionBars";
import { fmtAedRange, fmtPct } from "@/lib/market-planning/format";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

export default function AcquisitionOutlook() {
  const { plan, regions, pct, focus, setFocus } = usePlanner();
  const pendingShare = 1 - plan.coveredShare;

  return (
    <>
      <section className={ui.panel} id="forecast" aria-labelledby="forecast-title">
        <PanelHead
          id="forecast-title"
          title="Your market forecast"
          copy="See the expected acquisition requirements and lead opportunities based on your selected markets and investment strategy."
          right={<EvidencePill kind={plan.usesAssumption ? "assumption" : "client"} />}
        />

        {!plan.valid ? (
          <p className={f.invalid} role="status">
            {plan.message ?? "Enter a budget or lead target to see your forecast."}
          </p>
        ) : (
          <>
            <div className={f.subhead}>
              <h3 className={f.h3}>Estimated leads by monthly budget</h3>
              <span className={f.hint}>Hover the chart to read any budget level</span>
            </div>
            <LeadsCurve />

            <div className={f.subhead} style={{ marginTop: 24 }}>
              <h3 className={f.h3}>Where your budget goes</h3>
              <span className={f.hint}>Select a region to focus it across the workspace</span>
            </div>
            <SplitBar
              height={18}
              ariaLabel="Share of monthly budget by region"
              activeKey={focus?.kind === "region" ? focus.region : null}
              onSelect={(key) =>
                setFocus(focus?.kind === "region" && focus.region === key ? null : { kind: "region", region: key })
              }
              segments={regions.map((r, i) => ({
                key: r.region,
                label: r.region,
                value: r.share,
                color: rampColor(i),
                detail: fmtAedRange(r.spend) ?? undefined,
              }))}
            />
            <ul className={f.legend}>
              {regions.map((r, i) => {
                const on = focus?.kind === "region" && focus.region === r.region;
                return (
                  <li key={r.region}>
                    <button
                      type="button"
                      className={`${f.legendBtn} ${on ? f.legendOn : ""}`}
                      aria-pressed={on}
                      onClick={() => setFocus(on ? null : { kind: "region", region: r.region })}
                    >
                      <span className={f.swatch} style={{ background: rampColor(i) }} />
                      {r.region}
                      <span className={f.legendPct}>{r.markets.reduce((a, m) => a + (pct[m.iso2] ?? 0), 0)}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {plan.valid ? (
        <section className={ui.panel} id="regions" aria-labelledby="regions-title">
          <PanelHead
            id="regions-title"
            title="Budget compared with lead opportunity"
            copy="Where the money goes against where the leads come from. Lower-CPL regions return more leads per AED. Hatched bars are the remainder."
          />
          <RegionBars />
          {plan.pendingCount > 0 ? (
            <p className={f.coverageNote} role="note">
              <strong>Coverage:</strong>&nbsp;
              {plan.pendingCount} of {plan.markets.length} selected markets have no CPL benchmark, holding{" "}
              {fmtPct(pendingShare)} of the budget. Their spend stays in the plan but they add no estimated
              leads. Open a market to enter a labelled planning CPL.
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
