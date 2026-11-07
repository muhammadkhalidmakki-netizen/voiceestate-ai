"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import { axisText, hatch, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import type { MarketRow } from "../planner-context";
import { fmtAedRange, fmtCpl } from "@/lib/market-planning/format";

/** Estimated leads for each country in one region, with its share of the region. */
export default function RegionCountries({
  markets,
  pct,
  selected,
  onSelect,
}: {
  markets: MarketRow[];
  /** The country currently picked, highlighted while the others dim. */
  selected?: string | null;
  /** Whole-number share of the region's leads, by country. */
  pct: Record<string, number>;
  onSelect: (iso2: string) => void;
}) {
  const p = useChartPalette();
  const sorted = useMemo(
    () => [...markets].sort((a, b) => (b.leads.lo ?? -1) - (a.leads.lo ?? -1)),
    [markets],
  );
  const reversed = useMemo(() => [...sorted].reverse(), [sorted]);
  const max = Math.max(1, ...sorted.map((m) => m.leads.lo ?? 0));

  const option = useMemo(
    () => ({
      animationDuration: 600,
      animationDurationUpdate: 450,
      grid: { left: 4, right: 120, top: 6, bottom: 6, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "item",
        formatter: (x: { dataIndex: number }) => {
          const m = reversed[x.dataIndex];
          const leads = m.leads.lo === null ? "research pending" : `≈ ${Math.round(m.leads.lo)}${m.leads.hi === null ? "+" : ""} leads`;
          return `<b>${m.country.name}</b><br/>${leads}<br/>Budget ${Math.round(m.share * 100)}% · ${fmtAedRange(m.spend) ?? "—"}<br/>CPL ${m.cpl ? fmtCpl(m.cpl) : "pending"}`;
        },
      },
      xAxis: { type: "value", max: max * 1.05, show: false },
      yAxis: {
        type: "category",
        data: reversed.map((m) => m.country.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisText(p), color: p.ink, fontSize: 13, fontWeight: 600 },
      },
      series: [
        {
          type: "bar",
          barWidth: 20,
          data: reversed.map((m) => {
            const dim = selected && selected !== m.iso2;
            return {
              value: m.leads.lo ?? 0,
              itemStyle:
                m.leads.lo === null
                  ? { color: p.tint, decal: hatch(p), borderColor: p.amber, borderWidth: 1, borderRadius: 10, opacity: dim ? 0.4 : 1 }
                  : { color: m.iso2 === selected ? p.blueDeep : p.blue, borderRadius: 10, opacity: dim ? 0.35 : 1 },
            };
          }),
          showBackground: true,
          backgroundStyle: { color: p.tint, borderRadius: 10 },
          label: {
            show: true,
            position: "right",
            color: p.ink,
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 700,
            formatter: (x: { dataIndex: number }) => {
              const m = reversed[x.dataIndex];
              if (m.leads.lo === null) return "pending";
              return `${Math.round(m.leads.lo)}${m.leads.hi === null ? "+" : ""} leads  ·  ${pct[m.iso2] ?? 0}%`;
            },
          },
        },
      ],
    }),
    [p, reversed, pct, max, selected],
  );

  return (
    <EChart
      option={option}
      height={Math.max(130, sorted.length * 46 + 16)}
      ariaLabel={`Estimated leads by country: ${sorted.map((m) => `${m.country.name} ${m.leads.lo === null ? "pending" : Math.round(m.leads.lo)}`).join(", ")}`}
      onEvents={{
        click: (e) => {
          const idx = (e as { dataIndex?: number }).dataIndex;
          if (idx !== undefined && reversed[idx]) onSelect(reversed[idx].iso2);
        },
      }}
    />
  );
}
