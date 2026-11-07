"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import { axisText, hatch, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import { usePlanner } from "../planner-context";

/** Budget share against lead share by region. The hatched remainder is the share not accounted for. */
export default function RegionBars() {
  const { regions, focus, setFocus } = usePlanner();
  const p = useChartPalette();

  const option = useMemo(() => {
    const list = [...regions].reverse();
    const totalLeads = regions.reduce((s, r) => s + (r.leads.lo ?? 0), 0);
    const budget = list.map((r) => +(r.share * 100).toFixed(1));
    const leads = list.map((r) =>
      totalLeads > 0 && r.leads.lo !== null ? +(((r.leads.lo as number) / totalLeads) * 100).toFixed(1) : 0,
    );
    const dim = (region: string) => (focus?.kind === "region" && focus.region !== region ? 0.3 : 1);
    const mk = (name: string, data: number[], color: string, stack: string) => ({
      name,
      type: "bar",
      stack,
      barWidth: 9,
      barGap: "110%",
      data: data.map((v, i) => ({ value: v, itemStyle: { color, borderRadius: 6, opacity: dim(list[i].region) } })),
      label: {
        show: true,
        position: "right",
        color: p.ink2,
        fontFamily: "inherit",
        fontSize: 11,
        formatter: (x: { value: number }) => (x.value > 0 ? `${x.value}%` : ""),
      },
    });
    const rest = (name: string, data: number[], stack: string) => ({
      name,
      type: "bar",
      stack,
      barWidth: 9,
      barGap: "110%",
      silent: true,
      data: data.map((v) => Math.max(0, 100 - v)),
      itemStyle: { color: p.tint, borderRadius: 6, decal: hatch(p) },
      tooltip: { show: false },
    });
    return {
      animationDurationUpdate: 450,
      grid: { left: 4, right: 44, top: 6, bottom: 6, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        trigger: "item",
        formatter: (x: { seriesName: string; name: string; value: number }) =>
          `${x.name}<br/>${x.seriesName}: <b>${x.value}%</b>`,
      },
      xAxis: { type: "value", max: 100, show: false },
      yAxis: {
        type: "category",
        data: list.map((r) => r.region),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisText(p), color: p.ink, fontSize: 12, fontWeight: 600 },
      },
      series: [
        mk("Share of budget", budget, p.blue, "budget"),
        rest("budget-rest", budget, "budget"),
        mk("Share of estimated leads", leads, p.violet, "leads"),
        rest("leads-rest", leads, "leads"),
      ],
    };
  }, [regions, focus, p]);

  return (
    <EChart
      option={option}
      height={Math.max(170, regions.length * 74 + 20)}
      ariaLabel={`Share of budget and of estimated leads for ${regions.map((r) => r.region).join(", ")}`}
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
