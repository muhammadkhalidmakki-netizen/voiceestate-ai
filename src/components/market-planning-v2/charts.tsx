"use client";

import { useMemo } from "react";
import EChart from "../market-planning/charts/EChart";
import { alpha, axisText, hatch, tooltipBase } from "../market-planning/charts/common";
import { useChartPalette, type Palette } from "../market-planning/charts/palette";
import { usePlanner } from "../market-planning/planner-context";
import type { CohortMonth, SalesMilestone } from "@/lib/market-planning/sales";

/** Region colours: one emerald-to-teal family, so colour never needs a legend of many hues. */
export function regionColors(p: Palette): string[] {
  return [p.blueDeep, p.blue, p.violet, alpha(p.blue, 0.55), alpha(p.violet, 0.55), alpha(p.ink3, 0.5)];
}

export function AllocationDonut() {
  const { regions, focus, setFocus } = usePlanner();
  const p = useChartPalette();
  const colors = regionColors(p);

  const option = useMemo(
    () => ({
      animationDuration: 600,
      animationDurationUpdate: 500,
      tooltip: {
        ...tooltipBase(p),
        trigger: "item",
        formatter: (x: { name: string; value: number; percent: number }) => `${x.name}<br/><b>${x.percent.toFixed(0)}%</b> of budget`,
      },
      series: [
        {
          type: "pie",
          radius: ["62%", "88%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: { borderRadius: 8, borderColor: p.surface, borderWidth: 2 },
          label: { show: false },
          emphasis: { scaleSize: 4 },
          data: regions.map((r, i) => ({
            name: r.region,
            value: +(r.share * 1000).toFixed(1),
            itemStyle: {
              color: colors[i % colors.length],
              opacity: focus?.kind === "region" && focus.region !== r.region ? 0.3 : 1,
            },
          })),
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regions, focus, p],
  );

  return (
    <EChart
      option={option}
      height={210}
      ariaLabel={`Budget by region: ${regions.map((r) => `${r.region} ${Math.round(r.share * 100)} percent`).join(", ")}`}
      onEvents={{
        click: (e) => {
          const name = (e as { name?: string }).name;
          if (!name) return;
          setFocus(focus?.kind === "region" && focus.region === name ? null : { kind: "region", region: name });
        },
      }}
    />
  );
}

/** Two aligned charts: leads (new vs still maturing) and expected closes by age of the leads. */
export function CohortCharts({ months }: { months: CohortMonth[] }) {
  const p = useChartPalette();
  const labels = months.map((m) => `Month ${m.month}`);

  const leadsOption = useMemo(
    () => ({
      animationDurationUpdate: 450,
      grid: { left: 4, right: 10, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: alpha(p.blue, 0.06) } },
      },
      xAxis: { type: "category", data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisText(p), formatter: (v: string) => v.replace("Month ", "") } },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: p.line, type: "dashed" } },
        axisLabel: axisText(p),
      },
      series: [
        {
          name: "Still maturing (earlier leads)",
          type: "bar",
          stack: "leads",
          barWidth: "56%",
          data: months.map((m) => Math.round(m.maturingLeads)),
          itemStyle: { color: alpha(p.blue, 0.18), decal: hatch(p), borderRadius: [0, 0, 0, 0] },
        },
        {
          name: "New leads this month",
          type: "bar",
          stack: "leads",
          barWidth: "56%",
          data: months.map((m) => Math.round(m.newLeads)),
          itemStyle: { color: p.blue, borderRadius: [6, 6, 0, 0] },
        },
      ],
    }),
    [p, months, labels],
  );

  const salesOption = useMemo(() => {
    const band = (name: string, key: keyof CohortMonth, color: string) => ({
      name,
      type: "bar",
      stack: "closes",
      barWidth: "56%",
      data: months.map((m) => +((m[key] as number) as number).toFixed(3)),
      itemStyle: { color },
    });
    return {
      animationDurationUpdate: 450,
      grid: { left: 4, right: 10, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: alpha(p.blue, 0.06) } },
        valueFormatter: (v: number) => v.toFixed(2),
      },
      xAxis: { type: "category", data: labels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisText(p), formatter: (v: string) => v.replace("Month ", "") } },
      yAxis: [
        {
          type: "value",
          name: "Closes / month",
          nameTextStyle: { ...axisText(p), align: "left" },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: p.line, type: "dashed" } },
          axisLabel: axisText(p),
        },
        {
          type: "value",
          name: "Cumulative",
          nameTextStyle: { ...axisText(p), align: "right" },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: axisText(p),
        },
      ],
      series: [
        band("From leads 6+ months old", "fromSixPlus", alpha(p.violet, 0.45)),
        band("From leads 3–5 months old", "fromThreeToFive", alpha(p.blue, 0.45)),
        band("From leads 1–2 months old", "fromLastTwoMonths", alpha(p.blue, 0.75)),
        band("From this month's leads", "fromThisMonth", p.blueDeep),
        {
          name: "Cumulative expected sales",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: months.map((m) => +m.cumulative.toFixed(3)),
          lineStyle: { width: 2.5, color: p.ink },
          itemStyle: { color: p.ink },
        },
      ],
    };
  }, [p, months, labels]);

  return (
    <div>
      <EChart option={leadsOption} height={150} ariaLabel="Leads by month: new leads and earlier leads still maturing" />
      <EChart option={salesOption} height={200} ariaLabel="Expected sales closing each month, by age of the leads, with the cumulative total" />
    </div>
  );
}


/** Expected cumulative sales from ONE month of leads at each historical checkpoint.
 *  Bars follow the 19-case timing as a provisional shape; the last bar (long tail) is hatched. */
export function SalesBars({ eventual, milestones }: { eventual: number; milestones: SalesMilestone[] }) {
  const p = useChartPalette();
  const option = useMemo(() => {
    const fmt = (v: number) => (v < 10 ? v.toFixed(2) : v.toFixed(1));
    return {
      animationDuration: 700,
      animationDurationUpdate: 500,
      grid: { left: 4, right: 8, top: 30, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: alpha(p.blue, 0.06) } },
        formatter: (items: { dataIndex: number }[]) => {
          const m = milestones[items[0].dataIndex];
          return `<b>${m.label}</b><br/>${Math.round(m.share * 100)}% of historical cases closed<br/>≈ <b>${fmt(m.sales)}</b> sales from one month of leads`;
        },
      },
      xAxis: {
        type: "category",
        data: milestones.map((m) => `${m.label}\n${Math.round(m.share * 100)}%`),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisText(p), interval: 0, lineHeight: 15 },
      },
      yAxis: { type: "value", show: false, max: Math.max(eventual * 1.18, 0.5) },
      series: [
        {
          type: "bar",
          barWidth: "62%",
          data: milestones.map((m, i) => ({
            value: +m.sales.toFixed(3),
            itemStyle: m.tail
              ? { color: alpha(p.blue, 0.18), decal: hatch(p), borderColor: p.blue, borderWidth: 1, borderType: "dashed", borderRadius: [10, 10, 4, 4] }
              : { color: alpha(p.blue, 0.35 + (i / Math.max(1, milestones.length - 1)) * 0.65), borderRadius: [10, 10, 4, 4] },
          })),
          label: {
            show: true,
            position: "top",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            color: p.ink,
            formatter: (x: { dataIndex: number; value: number }) => `${milestones[x.dataIndex].tail ? "≈ " : ""}${fmt(x.value)}`,
          },
        },
      ],
    };
  }, [p, milestones, eventual]);

  return (
    <EChart
      option={option}
      height={230}
      ariaLabel={`Expected sales from one month of leads: ${milestones.map((m) => `${m.label} ${m.sales.toFixed(2)}`).join(", ")}`}
    />
  );
}
