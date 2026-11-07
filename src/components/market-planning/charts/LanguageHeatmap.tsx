"use client";

import { uiLanguages } from "../planner-state";
import { useMemo } from "react";
import EChart from "./EChart";
import { axisText, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import { usePlanner } from "../planner-context";
import { COUNTRY_BY_ISO, LANGUAGE_SEEDS, REGION_ORDER, languageLabel } from "@/lib/market-planning/catalog";

/** Selected languages against regions: how many mapped markets each language opens. Counts only. */
export default function LanguageHeatmap() {
  const { state } = usePlanner();
  const p = useChartPalette();
  const codes = Object.keys(uiLanguages(state.languages)).filter((c) => LANGUAGE_SEEDS.some((s) => s.code === c));

  const { cells, max, names } = useMemo(() => {
    const out: Array<[number, number, number, string]> = [];
    let mx = 0;
    codes.forEach((code, yi) => {
      REGION_ORDER.forEach((region, xi) => {
        const list = LANGUAGE_SEEDS.filter((s) => s.code === code && COUNTRY_BY_ISO.get(s.iso2)?.region === region);
        mx = Math.max(mx, list.length);
        out.push([xi, yi, list.length, list.map((s) => `${COUNTRY_BY_ISO.get(s.iso2)?.name}${s.diaspora ? " (diaspora proxy)" : ""}`).join(", ")]);
      });
    });
    return { cells: out, max: Math.max(1, mx), names: codes.map(languageLabel) };
  }, [codes]);

  const option = useMemo(
    () => ({
      animationDurationUpdate: 450,
      grid: { left: 4, right: 8, top: 26, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase(p),
        formatter: (x: { value: [number, number, number, string] }) =>
          `<b>${names[x.value[1]]}</b> in ${REGION_ORDER[x.value[0]]}: ${x.value[2]} market${x.value[2] === 1 ? "" : "s"}${x.value[3] ? `<br/><span style="color:${p.ink3}">${x.value[3]}</span>` : ""}`,
      },
      xAxis: {
        type: "category",
        position: "top",
        data: REGION_ORDER.map((r) => (r === "Other territories" ? "Other" : r)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisText(p), interval: 0 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        data: names,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...axisText(p), color: p.ink, fontWeight: 600, fontSize: 12 },
      },
      visualMap: {
        show: false,
        min: 0,
        max,
        inRange: { color: [p.tint, p.blue, p.blueDeep] },
      },
      series: [
        {
          type: "heatmap",
          data: cells,
          itemStyle: { borderColor: p.surface, borderWidth: 3, borderRadius: 8 },
          label: {
            show: true,
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 700,
            color: p.ink,
            formatter: (x: { value: [number, number, number] }) => (x.value[2] > 0 ? String(x.value[2]) : "·"),
          },
        },
      ],
    }),
    [p, cells, max, names],
  );

  if (codes.length === 0) return null;
  return (
    <EChart
      option={option}
      height={Math.max(110, codes.length * 42 + 44)}
      ariaLabel={`Mapped markets per region for ${names.join(", ")}`}
    />
  );
}
