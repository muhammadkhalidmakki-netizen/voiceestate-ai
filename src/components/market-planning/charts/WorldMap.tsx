"use client";

import { useMemo } from "react";
import EChart from "./EChart";
import { hatch, tooltipBase } from "./common";
import { useChartPalette } from "./palette";
import { usePlanner } from "../planner-context";
import { COUNTRIES } from "@/lib/market-planning/catalog";

// Registry names that differ from the map's feature names.
const ALIAS: Record<string, string> = {
  "United States": "United States of America",
  "Türkiye": "Turkey",
  "Russian Federation": "Russia",
  "Czechia": "Czechia",
  "Viet Nam": "Vietnam",
  "Korea, Republic of": "South Korea",
  "Iran, Islamic Republic of": "Iran",
  "Syrian Arab Republic": "Syria",
  "Tanzania, United Republic of": "Tanzania",
  "Bolivia, Plurinational State of": "Bolivia",
  "Venezuela, Bolivarian Republic of": "Venezuela",
  "Moldova, Republic of": "Moldova",
  "Congo, Democratic Republic of the": "Dem. Rep. Congo",
  "Lao People's Democratic Republic": "Laos",
  "Brunei Darussalam": "Brunei",
  "Eswatini": "eSwatini",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
  "Central African Republic": "Central African Rep.",
  "South Sudan": "S. Sudan",
  "Equatorial Guinea": "Eq. Guinea",
  "Western Sahara": "W. Sahara",
  "North Macedonia": "North Macedonia",
};

export const featureName = (name: string) => ALIAS[name] ?? name;
export const ISO_BY_FEATURE = new Map(COUNTRIES.map((c) => [featureName(c.name), c.iso2]));

/** Centre and size of each country (its largest piece), for zooming the map onto it. Filled when the map is registered. */
export type WorldBox = { cx: number; cy: number; w: number; h: number };
export const WORLD_BOXES = new Map<string, WorldBox>();

type Geom = { type: string; coordinates: number[][][] | number[][][][] };
function boxOf(g: Geom): WorldBox | null {
  const rings: number[][][] = g.type === "Polygon" ? [(g.coordinates as number[][][])[0]] : g.type === "MultiPolygon" ? (g.coordinates as number[][][][]).map((p) => p[0]) : [];
  let best: WorldBox | null = null;
  let bestArea = -1;
  for (const ring of rings) {
    if (!ring?.length) continue;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    const area = (x1 - x0) * (y1 - y0);
    if (area > bestArea) {
      bestArea = area;
      best = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
    }
  }
  return best;
}

export async function registerWorld(echarts: typeof import("echarts/core")) {
  if (echarts.getMap("mp-world")) return;
  const [{ feature }, topo] = await Promise.all([
    import("topojson-client"),
    import("world-atlas/countries-110m.json"),
  ]);
  const t = (topo as unknown as { default: never }).default ?? topo;
  const geo = feature(t as never, (t as { objects: { countries: never } }).objects.countries) as unknown as { features: Array<{ properties: { name: string }; geometry: Geom }> };
  // Antarctica takes a third of the map and is never a market.
  geo.features = geo.features.filter((f) => f.properties.name !== "Antarctica");
  for (const f of geo.features) {
    const b = boxOf(f.geometry);
    if (b) WORLD_BOXES.set(f.properties.name, b);
  }
  echarts.registerMap("mp-world", geo as never);
}

/** Budget share by country for the selected markets. Hatched = in plan, no CPL yet. */
export default function WorldMap({ onPick, height = 340 }: { onPick?: (iso2: string) => void; height?: number } = {}) {
  const { rows, openDetail } = usePlanner();
  const p = useChartPalette();

  const option = useMemo(() => {
    const data = rows.map((r) => ({
      name: featureName(r.country.name),
      value: +(r.share * 100).toFixed(1),
      amount: r.spend.hi ?? r.spend.lo ?? 0,
      pending: !r.cpl,
      itemStyle: r.cpl
        ? undefined
        : { areaColor: p.surface, borderColor: p.amber, borderWidth: 1.2, decal: hatch(p) },
    }));
    const max = Math.max(5, ...data.map((d) => d.value));
    return {
      animationDurationUpdate: 450,
      tooltip: {
        ...tooltipBase(p),
        trigger: "item",
        formatter: (x: { name: string; data?: { value: number; pending: boolean; amount: number } }) =>
          x.data
            ? `<b>${x.name}</b><br/>${x.data.value}% of your budget · AED ${Math.round(x.data.amount).toLocaleString("en-US")}${x.data.pending ? "<br/>CPL research pending" : ""}<br/><span style="color:${p.ink3}">Click for details</span>`
            : `${x.name}<br/><span style="color:${p.ink3}">Not in your plan</span>`,
      },
      visualMap: {
        show: false,
        min: 0,
        max,
        seriesIndex: 0,
        inRange: { color: [p.blueSoft, p.blue, p.blueDeep] },
      },
      series: [
        {
          type: "map",
          map: "mp-world",
          roam: false,
          selectedMode: false,
          top: 6,
          bottom: 6,
          left: 0,
          right: 0,
          aspectScale: 0.9,
          itemStyle: { areaColor: p.tint, borderColor: p.line, borderWidth: 0.6 },
          emphasis: { itemStyle: { areaColor: p.violet }, label: { show: false } },
          label: { show: false },
          data,
        },
      ],
    };
  }, [rows, p]);

  return (
    <EChart
      option={option}
      height={height}
      prepare={registerWorld}
      ariaLabel={`World map of your ${rows.length} selected markets, shaded by share of budget`}
      onEvents={{
        click: (e) => {
          const iso2 = ISO_BY_FEATURE.get((e as { name?: string }).name ?? "");
          if (iso2) (onPick ?? ((i: string) => openDetail({ kind: "country", iso2: i })))(iso2);
        },
      }}
    />
  );
}
