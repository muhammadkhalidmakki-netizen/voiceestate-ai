"use client";

import { motion } from "motion/react";
import { useMemo, type ReactNode } from "react";
import { COUNTRIES, SALES_CYCLE, REGION_ORDER, matureCpl, marketClassLabel } from "@/lib/market-planning/catalog";
import { rampColor } from "./viz";
import { usePlanner } from "./planner-context";
import m from "./micro.module.css";

/** Half-ring of rounded capsules, filled for a real fraction (0..1). The capsules light up in sequence. */
export function CoverageRing({ value, label }: { value: number; label: string }) {
  const N = 15;
  const filled = Math.round(Math.min(1, Math.max(0, value)) * N);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const caps = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const theta = Math.PI * (1 - t);
    const x = 100 + 76 * Math.cos(theta);
    const y = 100 - 76 * Math.sin(theta);
    return { i, x: r2(x), y: r2(y), rot: r2(90 - (theta * 180) / Math.PI), on: i < filled, fade: r2(0.35 + 0.65 * (i / Math.max(1, filled - 1))) };
  });
  return (
    <svg className={m.ring} viewBox="0 0 200 118" role="img" aria-label={`${label}: ${Math.round(value * 100)} percent`}>
      {caps.map((c) => {
        const geo = { x: r2(c.x - 6.5), y: r2(c.y - 14), width: 13, height: 28, rx: 6.5, transform: `rotate(${c.rot} ${c.x} ${c.y})` };
        return (
          <g key={c.i}>
            <rect {...geo} style={{ fill: "var(--mp-tint-2)" }} />
            <motion.rect
              {...geo}
              style={{ fill: "var(--mp-blue)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: c.on ? Math.min(1, c.fade) : 0 }}
              transition={{ duration: 0.35, delay: 0.1 + c.i * 0.045 }}
            />
          </g>
        );
      })}
      <text x="100" y="96" textAnchor="middle" className={m.ringValue}>
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

export type CapsuleItem = {
  key: string;
  /** Full name, used for the tooltip and screen readers. */
  label: string;
  /** Short caption under the capsule, e.g. a country code. */
  caption: ReactNode;
  /** Text above the capsule, e.g. "11%". */
  valueLabel?: ReactNode;
  /** 0..1, sets the capsule height. */
  value: number;
  /** Plain-language value for screen readers and the tooltip. */
  valueText: string;
  pending?: boolean;
  active?: boolean;
  dim?: boolean;
};

/** Vertical capsules, one per market, labelled with a value above and a code below.
 *  They grow in on load and animate on every change. Hatched = no CPL benchmark yet. */
export function CapsuleBars({ items, onSelect, ariaLabel }: { items: CapsuleItem[]; onSelect?: (key: string) => void; ariaLabel: string }) {
  const max = Math.max(0.0001, ...items.map((i) => i.value));
  const dense = items.length > 12;
  return (
    <div className={`${m.capsules} ${dense ? m.capsDense : ""}`} role="group" aria-label={ariaLabel}>
      {items.map((i, idx) => {
        const h = Math.max(14, (i.value / max) * 100);
        const cls = `${m.capsule} ${i.pending ? m.capsulePending : ""} ${i.active ? m.capsuleActive : ""}`;
        const motionProps = {
          className: cls,
          initial: { height: "0%", opacity: 0 },
          animate: { height: `${h}%`, opacity: i.dim ? 0.35 : 1 },
          transition: { duration: 0.6, delay: 0.1 + idx * 0.045, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
          title: `${i.label}: ${i.valueText}${i.pending ? " · CPL research pending" : ""}`,
        };
        return (
          <div key={i.key} className={m.capCol}>
            <span className={m.capLabel}>{i.valueLabel}</span>
            <span className={m.capTrack}>
              {onSelect ? (
                <motion.button type="button" {...motionProps} aria-label={`${i.label}, ${i.valueText}`} onClick={() => onSelect(i.key)} />
              ) : (
                <motion.span {...motionProps} />
              )}
            </span>
            <span className={m.capCaption} aria-hidden="true">{i.caption}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A capsule showing a range. The hatched tail means the upper end is open (unknown). */
export function CapsuleRange({ lo, hi, max }: { lo: number; hi: number | null; max: number }) {
  const loPct = Math.min(100, (lo / max) * 100);
  const hiPct = hi === null ? 100 : Math.min(100, (hi / max) * 100);
  const t = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
  return (
    <div className={m.range} aria-hidden="true">
      <motion.span className={m.rangeHi} data-open={hi === null ? "true" : undefined} initial={{ width: 0 }} animate={{ width: `${hiPct}%` }} transition={{ ...t, delay: 0.15 }} />
      <motion.span className={m.rangeLo} initial={{ width: 0 }} animate={{ width: `${loPct}%` }} transition={t} />
    </div>
  );
}

/** One dot per historical case, coloured by the window in which it closed. */
export function DotMatrix() {
  const cps = SALES_CYCLE.checkpoints;
  const counts = [...cps.map((c) => c.count), SALES_CYCLE.sample_size].map((c, i, a) => c - (i === 0 ? 0 : a[i - 1]));
  const dots = counts.flatMap((n, bi) => Array.from({ length: n }, (_, k) => ({ key: `${bi}-${k}`, bi })));
  return (
    <div className={m.dots} role="img" aria-label={`${SALES_CYCLE.sample_size} historical cases by closing window`}>
      {dots.map((d) => (
        <span key={d.key} className={m.dot} style={{ background: rampColor(d.bi) }} />
      ))}
    </div>
  );
}

/** Honeycomb of the whole country registry. Colour = how far each country is along the evidence pipeline. */
export function HexMap() {
  const { rows, openDetail } = usePlanner();
  const inPlan = useMemo(() => new Map(rows.map((r) => [r.iso2, !!r.cpl])), [rows]);

  const cells = useMemo(() => {
    const sorted = [...COUNTRIES].sort(
      (a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) || a.name.localeCompare(b.name),
    );
    const cols = 22;
    const r = 8.4;
    const w = Math.sqrt(3) * r;
    return {
      w: cols * w + w / 2 + 2,
      h: Math.ceil(sorted.length / cols) * r * 1.5 + r * 0.7,
      list: sorted.map((c, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return { c, x: col * w + (row % 2 ? w : w / 2) + 1, y: row * r * 1.5 + r + 1, r };
      }),
    };
  }, []);

  const fillFor = (iso: string, hasCpl: boolean, researched: boolean) => {
    if (inPlan.has(iso)) return inPlan.get(iso) ? "var(--mp-blue-deep)" : "url(#mp-hatch)";
    if (hasCpl) return "var(--mp-blue-mid)";
    if (researched) return "var(--mp-violet)";
    return "var(--mp-tint-2)";
  };

  return (
    <div>
      <svg className={m.hex} viewBox={`0 0 ${cells.w} ${cells.h}`} role="img" aria-label={`Honeycomb of ${COUNTRIES.length} countries by research status. ${rows.length} are in your plan.`}>
        <defs>
          <pattern id="mp-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--mp-surface)" />
            <rect width="1.6" height="4" fill="var(--mp-amber)" />
          </pattern>
        </defs>
        {cells.list.map(({ c, x, y, r }) => {
          const pts = Array.from({ length: 6 }, (_, k) => {
            const a = (Math.PI / 180) * (60 * k - 30);
            return `${(x + (r - 0.9) * Math.cos(a)).toFixed(2)},${(y + (r - 0.9) * Math.sin(a)).toFixed(2)}`;
          }).join(" ");
          const planned = inPlan.has(c.iso2);
          return (
            <polygon
              key={c.iso2}
              points={pts}
              className={m.hexCell}
              style={{ fill: fillFor(c.iso2, matureCpl(c) !== null, c.marketClass !== null) }}
              stroke={planned ? "var(--mp-ink)" : "none"}
              strokeWidth={planned ? 0.7 : 0}
              onClick={() => openDetail({ kind: "country", iso2: c.iso2 })}
            >
              <title>{`${c.name} · ${marketClassLabel(c)}${planned ? " · in your plan" : ""}`}</title>
            </polygon>
          );
        })}
      </svg>
      <ul className={m.hexLegend}>
        <li><i style={{ background: "var(--mp-blue-deep)" }} />In plan, CPL known</li>
        <li><i className={m.hexHatch} />In plan, CPL pending</li>
        <li><i style={{ background: "var(--mp-blue-mid)" }} />CPL benchmark mapped</li>
        <li><i style={{ background: "var(--mp-violet)" }} />Demand researched</li>
        <li><i style={{ background: "var(--mp-tint-2)" }} />Research pending</li>
      </ul>
    </div>
  );
}

export type MonthDetail = {
  /** Short label under the bar: "3", or "13+" for the long tail. */
  label: string;
  /** Heading of the tooltip. */
  title: string;
  month: number;
  /** Sales from this batch expected to close in this month. */
  closes: number;
  /** Running total of expected sales from this batch. */
  total: number;
  /** Share of this batch's sales that close in this month, 0..1. */
  share: number;
  /** All sales this batch is expected to produce. */
  eventual: number;
};

/** Twelve vertical bars, one per month after the leads arrive, each numbered. Height is the running
 *  total of expected sales so far (it only ever grows). Hover or focus a bar for the details. Flags mark the month
 *  in which each sale (1st, 2nd, ...) is expected. */
export function MonthBars({
  values,
  details,
  flags,
  more,
  tall = false,
}: {
  values: number[];
  details: MonthDetail[];
  flags: Array<string | null>;
  /** An extra last column with a button, e.g. "13+" to open the full chart. */
  more?: { label: string; title: string; onClick: () => void };
  tall?: boolean;
}) {
  const N = values.length;
  return (
    <div className={`${m.mBars} ${values.length > 16 || more ? m.mBarsDense : ""} ${tall ? m.mBarsTall : ""}`} role="group" aria-label="Expected sales so far, month by month after the leads arrive">
      {values.map((v, i) => {
        const d = details[i];
        const side = i < 3 ? m.tipLeft : i > N - 4 ? m.tipRight : "";
        return (
          <div
            key={i}
            className={m.mCol}
            tabIndex={0}
            aria-label={`${d.title}: about ${d.total.toFixed(1)} of ${d.eventual.toFixed(1)} expected sales made by then; this month adds ${d.closes < 0.1 ? "under 0.1" : d.closes.toFixed(1)}`}
          >
            <span className={m.mFlag} style={{ visibility: flags[i] ? "visible" : "hidden" }}>{flags[i] ?? "."}</span>
            <span className={m.mTrack}>
              <motion.span
                className={`${m.mBar} ${flags[i] ? m.mBarFirst : ""}`}
                initial={{ height: "0%" }}
                animate={{ height: `${Math.max(10, Math.min(1, Math.max(0, v)) * 100)}%` }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className={m.mLabel}>{d.label}</span>
            <span className={`${m.mTip} ${side}`} role="tooltip">
              <strong>{d.title}</strong>
              <span>About {d.total.toFixed(1)} of {d.eventual.toFixed(1)} expected sales made by then</span>
              <span>This month adds {d.closes < 0.1 ? "under 0.1" : `about ${d.closes.toFixed(1)}`}</span>
              {flags[i] ? <em>Your {flags[i]} sale is likely around here</em> : null}
            </span>
          </div>
        );
      })}
      {more ? (
        <div className={m.mCol}>
          <span className={m.mFlag} style={{ visibility: "hidden" }}>.</span>
          <span className={m.mTrack}>
            <button type="button" className={m.mMore} onClick={more.onClick} title={more.title} aria-label={more.title}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M8.5 2H12v3.5M12 2L7.5 6.5M5.5 3H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
          <span className={m.mLabel}>{more.label}</span>
        </div>
      ) : null}
    </div>
  );
}
