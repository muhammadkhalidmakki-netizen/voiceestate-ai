"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe, Minus, Plus } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import { ISO_BY_FEATURE } from "../market-planning/charts/WorldMap";
import { fmtAed } from "@/lib/market-planning/format";
import h from "./insights-home.module.css";

/* A small hand-drawn world map (SVG). It replaces the chart library map so that nothing glitches at the date line,
   it can fly to a country smoothly, and it labels the country it shows. Coordinates are an equirectangular projection. */

const W = 1000;
const LAT_TOP = 84;
const LAT_BOTTOM = -56;
const H = ((LAT_TOP - LAT_BOTTOM) / 360) * W; // 388.9
const ASPECT = 2.4; // map frame width / height
const WORLD: View = { x: 0, y: (H - W / ASPECT) / 2, w: W, h: W / ASPECT };

type View = { x: number; y: number; w: number; h: number };
type Piece = { iso2: string | null; name: string; d: string; cx: number; cy: number; bw: number; bh: number };

const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * H;

type Geom = { type: string; coordinates: number[][][] | number[][][][] };

/** One ring as an SVG path, with longitudes unwrapped so a country crossing the date line stays in one piece. */
function ringPath(ring: number[][], shift: number): { d: string; minX: number; maxX: number; minY: number; maxY: number } {
  let prev = ring[0][0];
  let d = "";
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  ring.forEach(([lon, lat], i) => {
    let l = lon;
    while (l - prev > 180) l -= 360;
    while (l - prev < -180) l += 360;
    prev = l;
    const x = px(l) + shift;
    const y = py(lat);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return { d: d + "Z", minX, maxX, minY, maxY };
}

function buildPiece(name: string, g: Geom): Piece | null {
  const polys: number[][][][] = g.type === "Polygon" ? [g.coordinates as number[][][]] : g.type === "MultiPolygon" ? (g.coordinates as number[][][][]) : [];
  let d = "";
  let best: { cx: number; cy: number; bw: number; bh: number; area: number } | null = null;
  for (const poly of polys) {
    for (let r = 0; r < poly.length; r++) {
      const ring = poly[r];
      if (!ring || ring.length < 3) continue;
      const base = ringPath(ring, 0);
      d += base.d;
      // A piece that runs past either edge of the map is drawn again on the other side.
      if (base.maxX > W) d += ringPath(ring, -W).d;
      if (base.minX < 0) d += ringPath(ring, W).d;
      if (r === 0) {
        const bw = base.maxX - base.minX;
        const bh = base.maxY - base.minY;
        const area = bw * bh;
        if (!best || area > best.area) best = { cx: (base.minX + base.maxX) / 2, cy: (base.minY + base.maxY) / 2, bw, bh, area };
      }
    }
  }
  if (!best || !d) return null;
  return { iso2: ISO_BY_FEATURE.get(name) ?? null, name, d, cx: best.cx, cy: best.cy, bw: best.bw, bh: best.bh };
}

let worldCache: Promise<Piece[]> | null = null;
function loadWorld(): Promise<Piece[]> {
  worldCache ??= Promise.all([import("topojson-client"), import("world-atlas/countries-110m.json")]).then(([{ feature }, topo]) => {
    const t = (topo as unknown as { default: never }).default ?? topo;
    const geo = feature(t as never, (t as { objects: { countries: never } }).objects.countries) as unknown as { features: Array<{ properties: { name: string }; geometry: Geom }> };
    return geo.features.filter((f) => f.properties.name !== "Antarctica").map((f) => buildPiece(f.properties.name, f.geometry)).filter((p): p is Piece => p !== null);
  });
  return worldCache;
}

const clampView = (v: View): View => {
  const w = Math.min(W, Math.max(24, v.w));
  const hh = w / ASPECT;
  return { w, h: hh, x: Math.min(W - w, Math.max(0, v.x)), y: Math.min(H - hh + 14, Math.max(-14, v.y)) };
};

/**
 * The world map for the market breakdown. Drag to move, scroll or use + and − to zoom. Selecting a market (here or from
 * the chips below) flies the map to that country and labels it; selecting it again, or "Show whole map", flies back.
 */
export type Verdict = { kind: "best" | "strong" | "good" | "ok" | "weak"; label: string };

export const VERDICT_FILL: Record<Verdict["kind"], string> = { best: "#12b76a", strong: "#3b7bff", good: "#f59a23", ok: "#9aa6bd", weak: "#e5484d" };

export default function FocusMap({ focus, onFocus, verdicts }: { focus: string | null; onFocus: (iso2: string | null) => void; verdicts: Record<string, Verdict> }) {
  const { rows } = usePlanner();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [view, setView] = useState<View>(WORLD);
  const [tip, setTip] = useState<{ iso2: string; x: number; y: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<(f: number, ox: number, oy: number) => void>(() => {});
  const raf = useRef<number | null>(null);
  const viewRef = useRef(view);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    loadWorld().then((p) => live && setPieces(p));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const fly = useCallback((to: View) => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    const from = viewRef.current;
    const target = clampView(to);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(target);
      return;
    }
    const start = performance.now();
    const dur = 750;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // Move the centre and zoom the width on a log scale, so the flight feels even.
      const cx = from.x + from.w / 2 + (target.x + target.w / 2 - (from.x + from.w / 2)) * e;
      const cy = from.y + from.h / 2 + (target.y + target.h / 2 - (from.y + from.h / 2)) * e;
      const w = from.w * Math.pow(target.w / from.w, e);
      setView({ x: cx - w / 2, y: cy - w / ASPECT / 2, w, h: w / ASPECT });
      if (k < 1) raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  const byIso = useMemo(() => new Map(pieces.filter((p) => p.iso2).map((p) => [p.iso2 as string, p])), [pieces]);

  // Fly to the focused country (or back to the whole world) whenever the focus or the map data changes.
  useEffect(() => {
    if (!pieces.length) return;
    const id = requestAnimationFrame(() => {
      const p = focus ? byIso.get(focus) : null;
      if (p) {
        const w = Math.max(46, Math.min(W, Math.max(p.bw * 2.4, p.bh * 2.4 * ASPECT)));
        fly({ x: p.cx - w / 2, y: p.cy - w / ASPECT / 2, w, h: w / ASPECT });
      } else fly(WORLD);
    });
    return () => cancelAnimationFrame(id);
  }, [focus, pieces.length, byIso, fly]);

  const planned = useMemo(() => new Map(rows.map((r) => [r.iso2, r])), [rows]);

  const zoomBy = (factor: number, ox = 0.5, oy = 0.5) => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    setView((cur) => {
      const w = Math.min(W, Math.max(24, cur.w * factor));
      const next = clampView({ x: cur.x + (cur.w - w) * ox, y: cur.y + (cur.h - w / ASPECT) * oy, w, h: w / ASPECT });
      return next;
    });
  };

  useEffect(() => {
    zoomRef.current = zoomBy;
  });
  // Scrolling over the map zooms it instead of scrolling the page (a listener that is allowed to cancel the scroll).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomRef.current(e.deltaY > 0 ? 1.18 : 1 / 1.18, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fontSize = Math.max(4, view.w / 38);
  const tipRow = tip ? planned.get(tip.iso2) : null;

  return (
    <div className={h.mapFrame} ref={frame}>
      <svg
        className={h.mapSvg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label={`World map of your ${rows.length} selected markets, shaded by share of budget. Drag to move, scroll to zoom, click a market to zoom in.`}
        ref={svgRef}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, moved: false };
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
          if (!d.moved) return;
          const r = e.currentTarget.getBoundingClientRect();
          d.x = e.clientX;
          d.y = e.clientY;
          setTip(null);
          setView((cur) => clampView({ ...cur, x: cur.x - (dx / r.width) * cur.w, y: cur.y - (dy / r.height) * cur.h }));
        }}
        onPointerUp={() => {
          // a click is a press that did not move; the countries handle it themselves
          window.setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => setTip(null)}
      >
        <rect x={-50} y={-50} width={W + 100} height={H + 100} className={h.mapSea} />
        {pieces.map((p) => {
          const r = p.iso2 ? planned.get(p.iso2) : undefined;
          const on = p.iso2 !== null && p.iso2 === focus;
          const vd = p.iso2 ? verdicts[p.iso2] : undefined;
          return (
            <path
              key={p.name}
              d={p.d}
              className={`${h.land} ${r ? h.landIn : ""} ${on ? h.landOn : ""} ${r && !r.cpl ? h.landPending : ""}`}
              style={r && vd ? { fill: VERDICT_FILL[vd.kind] } : undefined}
              onPointerEnter={(e) => {
                if (!p.iso2 || drag.current?.moved) return;
                const box = frame.current?.getBoundingClientRect();
                if (box) setTip({ iso2: p.iso2, x: e.clientX - box.left, y: e.clientY - box.top });
              }}
              onPointerMove={(e) => {
                const box = frame.current?.getBoundingClientRect();
                if (box && p.iso2 && !drag.current?.moved) setTip({ iso2: p.iso2, x: e.clientX - box.left, y: e.clientY - box.top });
              }}
              onClick={() => {
                if (drag.current?.moved || !p.iso2 || !r) return;
                onFocus(focus === p.iso2 ? null : p.iso2);
              }}
            />
          );
        })}
        {focus && byIso.get(focus) ? (
          <text x={byIso.get(focus)!.cx} y={byIso.get(focus)!.cy} className={h.mapLabel} style={{ fontSize }} textAnchor="middle" dominantBaseline="middle">
            {planned.get(focus)?.country.name}
          </text>
        ) : null}
      </svg>

      {view.w < W - 6 ? (
        <button
          type="button"
          className={h.mapReset}
          onClick={() => {
            onFocus(null);
            fly(WORLD);
          }}
        >
          <Globe size={15} aria-hidden="true" /> Whole map
        </button>
      ) : null}

      <div className={h.mapZoom}>
        <button type="button" aria-label="Zoom in" onClick={() => fly({ ...viewRef.current, x: viewRef.current.x + viewRef.current.w * 0.2, y: viewRef.current.y + viewRef.current.h * 0.2, w: viewRef.current.w * 0.6, h: (viewRef.current.w * 0.6) / ASPECT })}>
          <Plus size={14} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => fly({ x: viewRef.current.x - viewRef.current.w * 0.25, y: viewRef.current.y - viewRef.current.h * 0.25, w: viewRef.current.w * 1.5, h: (viewRef.current.w * 1.5) / ASPECT })}>
          <Minus size={14} aria-hidden="true" />
        </button>
      </div>

      {tip && tipRow ? (
        <div className={h.mapTip} style={{ left: tip.x + 12, top: tip.y + 12 }}>
          <b>{tipRow.country.name}</b>
          {verdicts[tipRow.iso2] ? <span className={h.tipVerdict} style={{ color: VERDICT_FILL[verdicts[tipRow.iso2].kind] }}>{verdicts[tipRow.iso2].label}</span> : null}
          <span>{Math.round(tipRow.share * 100)}% of your budget · {fmtAed(Math.round(tipRow.spend.hi ?? tipRow.spend.lo ?? 0))}</span>
          <small>Click to zoom in</small>
        </div>
      ) : null}
      {!pieces.length ? <div className={h.mapLoading} aria-hidden="true" /> : null}
    </div>
  );
}
