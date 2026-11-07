"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import { alpha, axisText, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import { usePlanner } from "../planner-context";
import { leadsPerAed } from "@/lib/market-planning/model";
import { fmtAed, fmtInt } from "@/lib/market-planning/format";

type TipItem = { seriesName: string; value: [number, number]; color: string };

/** Estimated leads against monthly budget for the current portfolio. Lines come
 *  straight from the model: low = upper CPL, high = lower CPL, plus the Europe
 *  learning and mature benchmarks where both are supplied. */
export default function LeadsCurve() {
  const { rows, plan } = usePlanner();
  const p = useChartPalette();
  const m = plan.maturity;
  const budget = plan.budget.hi ?? 0;

  const lpa = useMemo(
    () => leadsPerAed(rows.map((r) => ({ iso2: r.iso2, share: r.share, cpl: r.cpl }))),
    [rows],
  );

  const xs = useMemo(() => {
    const maxRaw = Math.max(budget * 1.8, 10000);
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxRaw)));
    const max = Math.ceil(maxRaw / magnitude) * magnitude;
    const steps = 40;
    return Array.from({ length: steps + 1 }, (_, i) => Math.round((max / steps) * i));
  }, [budget]);

  const hasData = lpa.coveredShare > 0 && plan.valid;

  const option = useMemo(() => {
    const series: Record<string, unknown>[] = [];
    series.push({
      name: "Low estimate (higher CPL)",
      type: "line",
      smooth: true,
      showSymbol: false,
      data: xs.map((x) => [x, +(x * lpa.lo).toFixed(2)]),
      lineStyle: { width: 2.5, color: p.blue },
      itemStyle: { color: p.blue },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: alpha(p.blue, p.dark ? 0.42 : 0.3) },
            { offset: 1, color: alpha(p.blue, 0) },
          ],
        },
      },
      markLine: {
        symbol: "none",
        silent: true,
        lineStyle: { color: p.ink, type: "dashed", width: 1.2 },
        label: {
          formatter: `Your budget ${fmtAed(budget)}`,
          color: p.ink,
          fontFamily: "inherit",
          fontSize: 11,
          position: "insideEndTop",
        },
        data: budget > 0 ? [{ xAxis: budget }] : [],
      },
      markPoint: {
        symbolSize: 12,
        itemStyle: { color: p.surface, borderColor: p.blue, borderWidth: 3 },
        label: { show: false },
        data: budget > 0 ? [{ coord: [budget, +(budget * lpa.lo).toFixed(2)] }] : [],
      },
    });
    if (lpa.hi !== null) {
      const hi = lpa.hi;
      series.push({
        name: "High estimate (lower CPL)",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: xs.map((x) => [x, +(x * hi).toFixed(2)]),
        lineStyle: { width: 2.5, color: p.violet },
        itemStyle: { color: p.violet },
        areaStyle: { color: alpha(p.violet, p.dark ? 0.12 : 0.1) },
      });
    }
    if (m) {
      series.push(
        {
          name: "Europe slice · mature",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: xs.map((x) => [x, +((x * m.sliceShare) / m.matureCpl).toFixed(2)]),
          lineStyle: { width: 2, type: "dashed", color: p.blueDeep },
          itemStyle: { color: p.blueDeep },
        },
        {
          name: "Europe slice · learning",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: xs.map((x) => [x, +((x * m.sliceShare) / m.learningCpl).toFixed(2)]),
          lineStyle: { width: 2, type: "dotted", color: p.ink3 },
          itemStyle: { color: p.ink3 },
        },
      );
    }
    return {
      animationDuration: 500,
      animationDurationUpdate: 450,
      grid: { left: 8, right: 16, top: 30, bottom: 6, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "axis",
        axisPointer: { type: "line", lineStyle: { color: p.line } },
        formatter: (params: TipItem[]) => {
          if (!params.length) return "";
          const head = `<div style="font-weight:700;margin-bottom:4px">${fmtAed(params[0].value[0])} / month</div>`;
          const lines = params
            .map(
              (s) =>
                `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:6px"></span>${s.seriesName}: <b>${fmtInt(s.value[1])}</b></div>`,
            )
            .join("");
          return head + lines;
        },
      },
      xAxis: {
        type: "value",
        min: 0,
        max: xs[xs.length - 1],
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { ...axisText(p), formatter: (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v)) },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: p.line, type: "dashed" } },
        axisLabel: axisText(p),
        name: "Leads / month",
        nameTextStyle: { ...axisText(p), align: "left" },
      },
      series,
    };
  }, [p, xs, lpa, budget, m]);

  if (!hasData) {
    return (
      <p style={{ margin: 0, color: "var(--mp-ink-2)", fontSize: "0.875rem" }}>
        Add a market with a CPL benchmark and a valid budget to see the lead curve.
      </p>
    );
  }

  return (
    <>
      <EChart
        option={option}
        height={300}
        ariaLabel={`Estimated leads against monthly budget. At ${fmtAed(budget)} the low estimate is ${fmtInt(budget * lpa.lo)} leads.`}
      />
      <p style={{ margin: "8px 2px 0", fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--mp-ink-3)" }}>
        {lpa.hi === null
          ? "No high estimate is drawn because a selected benchmark is 'AED 30 or less' and has no lower bound. "
          : ""}
        Lines are modelled from the client regional CPL benchmarks, not forecasts of results.
      </p>
    </>
  );
}
