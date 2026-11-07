"use client";

import { PanelHead, EvidencePill } from "../ui";
import { usePlanner, inFocus } from "../planner-context";
import { LiveRange } from "../viz";
import { cplProvenance, marketClassLabel } from "@/lib/market-planning/catalog";
import { fmtAedRange, fmtCpl, fmtCplRange, fmtLeadsRange } from "@/lib/market-planning/format";
import ui from "../ui.module.css";
import f from "./forecast.module.css";
import v from "../viz.module.css";

const CONF_LABEL: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };

export default function MarketTable() {
  const { rows, pct, plan, focus, setFocus, openDetail } = usePlanner();
  const sorted = [...rows].sort((a, b) => b.share - a.share);
  const visible = sorted.filter((r) => inFocus(focus, r));
  const maxShare = Math.max(0.0001, ...rows.map((r) => r.share));

  return (
    <section className={ui.panel} id="breakdown" aria-labelledby="breakdown-title">
      <PanelHead
        id="breakdown-title"
        title="Market breakdown"
        copy="Allocated investment, CPL reference and estimated leads for every selected market. Select a market for its evidence and to edit its planning CPL."
        right={
          focus ? (
            <span className={f.filterChip}>
              {focus.kind === "region" ? focus.region : rows.find((r) => r.iso2 === focus.iso2)?.country.name}
              <button type="button" onClick={() => setFocus(null)}>
                Clear
              </button>
            </span>
          ) : undefined
        }
      />

      <div className={f.tHead} aria-hidden="true">
        <span>Market</span>
        <span>Budget share</span>
        <span>Investment</span>
        <span>CPL reference</span>
        <span>Est. leads</span>
      </div>
      <ul className={f.table} style={{ marginTop: 0 }}>
        {visible.map((r) => {
          const focused = focus?.kind === "country" && focus.iso2 === r.iso2;
          const prov = r.cpl && r.cpl.source === "client-regional-proxy" && r.cpl.regionLabel !== "Your override" ? cplProvenance(r.iso2) : null;
          return (
            <li key={r.iso2}>
              <button
                type="button"
                className={`${f.tRow} ${focused ? f.tFocus : ""} ${!r.cpl ? f.tPending : ""}`}
                onClick={() => {
                  setFocus({ kind: "country", iso2: r.iso2 });
                  openDetail({ kind: "country", iso2: r.iso2 });
                }}
                aria-label={`${r.country.name}: open details`}
              >
                <span className={f.tName}>
                  <span className={f.tNameMain}>{r.country.name}</span>
                  <span className={f.tNameSub}>
                    {r.country.region} · {marketClassLabel(r.country)}
                  </span>
                </span>
                <span className={f.tGrid}>
                  <span className={f.tCell}>
                    <span className={f.tCellLabel}>Budget share</span>
                    <span className={f.shareBar}>
                      <span className={v.meterTrack} style={{ flex: 1, height: 8 }} aria-hidden="true">
                        <span className={`${v.meterFill} ${v.blue}`} style={{ width: `${(r.share / maxShare) * 100}%` }} />
                      </span>
                      <span>{pct[r.iso2]}%</span>
                    </span>
                  </span>
                  <span className={f.tCell}>
                    <span className={f.tCellLabel}>Investment</span>
                    <span>{fmtAedRange(r.spend) ?? "—"}</span>
                  </span>
                  <span className={f.tCell}>
                    <span className={f.tCellLabel}>CPL reference</span>
                    {r.cpl ? (
                      <>
                        <span>{fmtCpl(r.cpl)}</span>
                        <span className={ui.subtle}>
                          {r.cpl.source === "planning-assumption"
                            ? "Your own figure"
                            : r.cpl.source === "modelled-estimate"
                            ? "Estimate · low confidence"
                            : `Your benchmark${prov ? ` · ${CONF_LABEL[prov.confidence] ?? prov.confidence} conf.` : ""}`}
                        </span>
                      </>
                    ) : (
                      <EvidencePill kind="pending" />
                    )}
                  </span>
                  <span className={f.tCell}>
                    <span className={f.tCellLabel}>Est. leads</span>
                    <span>
                      {fmtLeadsRange(r.leads) === null ? (
                        <span style={{ color: "var(--mp-ink-3)" }}>Not yet validated</span>
                      ) : (
                        <LiveRange range={r.leads} kind="leads" />
                      )}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={f.tFoot} style={{ border: "1px solid var(--mp-line)", borderTop: 0, borderRadius: "0 0 14px 14px", marginTop: -1 }}>
        <span>
          <span>Total investment </span>
          {plan.valid ? fmtAedRange(plan.budget) ?? "—" : "—"}
        </span>
        <span>
          <span>Blended CPL </span>
          {fmtCplRange(plan.blendedCpl) ?? "Not yet validated"}
        </span>
        <span>
          <span>Estimated leads </span>
          {plan.valid ? (fmtLeadsRange(plan.leads) ?? "Not yet validated") : "—"}
        </span>
      </div>
      <p className={ui.subtle} style={{ margin: "10px 2px 0" }}>
        Cost per lead comes from your own benchmarks. Where you have none, a low-confidence estimate with a safety margin is shown. None is a measured
        result for that country. Markets without a benchmark show research pending, never zero.
      </p>
    </section>
  );
}
