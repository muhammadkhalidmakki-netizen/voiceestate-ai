"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import { alpha, axisText, hatch, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import { SALES_CYCLE } from "@/lib/market-planning/catalog";

/** Historical sales-maturity curve from the 19 supplied cases. It is a timing pattern only. */
export default function SalesCurve() {
  const p = useChartPalette();
  const cps = SALES_CYCLE.checkpoints;
  const tail = SALES_CYCLE.long_tail;

  const option = useMemo(() => {
    const labels = [...cps.map((c) => `${c.day} days`), `${tail.from_month}–${tail.to_month} months`];
    // Numeric x positions 0..5 (one per checkpoint) so the median can sit exactly between 60 and 90 days.
    const solid = cps.map((c, i) => [i, c.share_percent]);
    const last = cps.length - 1;
    const tailSeg = [[last, cps[last].share_percent], [last + 1, 100]];
    const medianIndex = 1 + (SALES_CYCLE.median_days - 60) / 30;
    return {
      animationDuration: 700,
      grid: { left: 6, right: 14, top: 34, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "axis",
        formatter: (items: { value: [number, number] }[]) => {
          const it = items[items.length - 1];
          return `<b>${labels[it.value[0]]}</b><br/>${it.value[1]}% of the ${SALES_CYCLE.sample_size} historical cases`;
        },
      },
      xAxis: {
        type: "value",
        boundaryGap: [0.04, 0.04],
        interval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { ...axisText(p), formatter: (v: number) => (Number.isInteger(v) ? (labels[v] ?? "") : "") },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisText(p), formatter: "{value}%" },
        splitLine: { lineStyle: { color: p.line, type: "dashed" } },
      },
      series: [
        {
          name: "Cumulative share",
          type: "line",
          smooth: 0.35,
          data: solid,
          symbolSize: 9,
          lineStyle: { width: 3, color: p.blue },
          itemStyle: { color: p.surface, borderColor: p.blue, borderWidth: 3 },
          label: { show: true, position: "top", color: p.ink, fontFamily: "inherit", fontSize: 11, fontWeight: 700, formatter: (x: { value: [number, number] }) => `${x.value[1]}%` },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: alpha(p.blue, p.dark ? 0.4 : 0.28) },
                { offset: 1, color: alpha(p.blue, 0) },
              ],
            },
          },
          markLine: {
            symbol: "none",
            silent: true,
            lineStyle: { color: p.ink, type: "dashed", width: 1.2 },
            label: { formatter: `Median ${SALES_CYCLE.median_days} days`, color: p.ink, fontFamily: "inherit", fontSize: 11, position: "end" },
            data: [{ xAxis: medianIndex }],
          },
        },
        {
          name: "Long tail",
          type: "line",
          smooth: 0.2,
          data: tailSeg,
          symbolSize: 9,
          lineStyle: { width: 2.5, type: "dashed", color: p.violet },
          itemStyle: { color: p.surface, borderColor: p.violet, borderWidth: 3 },
          areaStyle: { color: p.hatch, decal: hatch(p) },
          label: { show: true, position: "top", color: p.violet, fontFamily: "inherit", fontSize: 11, fontWeight: 700, formatter: (x: { dataIndex: number }) => (x.dataIndex === 1 ? `+${tail.share_percent}% tail` : "") },
        },
      ],
    };
  }, [p, cps, tail]);

  return (
    <EChart
      option={option}
      height={250}
      ariaLabel={`Cumulative share of the ${SALES_CYCLE.sample_size} historical cases by checkpoint: ${cps.map((c) => `${c.day} days ${c.share_percent}%`).join(", ")}. Median ${SALES_CYCLE.median_days} days. Long tail ${tail.from_month} to ${tail.to_month} months.`}
    />
  );
}
