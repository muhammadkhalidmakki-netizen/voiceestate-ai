"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import { alpha, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import { usePlanner } from "../planner-context";
import { COUNTRIES, matureCpl } from "@/lib/market-planning/catalog";

/** Research coverage, not conversion: how far each country is along the evidence pipeline. */
export default function EvidenceFunnel() {
  const { rows } = usePlanner();
  const p = useChartPalette();

  const stages = useMemo(() => {
    const researched = COUNTRIES.filter((c) => c.marketClass !== null).length;
    const withCpl = COUNTRIES.filter((c) => matureCpl(c) !== null).length;
    return [
      { name: "Worldwide registry", value: COUNTRIES.length },
      { name: "Dubai-demand signal researched", value: researched },
      { name: "Client CPL benchmark mapped", value: withCpl },
      { name: "In your plan", value: rows.length },
      { name: "In your plan with a CPL", value: rows.filter((r) => r.cpl).length },
    ];
  }, [rows]);

  const option = useMemo(() => {
    const ramp = [p.blueSoft, alpha(p.blue, 0.4), alpha(p.blue, 0.7), p.blue, p.blueDeep];
    return {
      animationDurationUpdate: 450,
      tooltip: { ...tooltipBase(p), trigger: "item", formatter: "{b}: <b>{c}</b>" },
      series: [
        {
          type: "funnel",
          sort: "none",
          left: 0,
          right: 0,
          top: 4,
          bottom: 4,
          min: 0,
          max: COUNTRIES.length,
          minSize: "14%",
          gap: 4,
          label: { show: true, position: "inside", fontFamily: "inherit", fontSize: 11, fontWeight: 600, formatter: "{c}" },
          labelLine: { show: false },
          itemStyle: { borderWidth: 0, borderRadius: 8 },
          data: stages.map((s, i) => ({
            ...s,
            itemStyle: { color: ramp[i] },
            label: { color: i >= 2 ? "#ffffff" : p.ink },
          })),
        },
      ],
    };
  }, [p, stages]);

  return (
    <div>
      <EChart
        option={option}
        height={200}
        ariaLabel={`Evidence funnel: ${stages.map((s) => `${s.name} ${s.value}`).join(", ")}`}
      />
      <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", fontSize: "0.75rem", lineHeight: 1.7, color: "var(--mp-ink-2)" }}>
        {stages.map((s) => (
          <li key={s.name} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{s.name}</span>
            <strong style={{ fontVariantNumeric: "tabular-nums", color: "var(--mp-ink)" }}>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
