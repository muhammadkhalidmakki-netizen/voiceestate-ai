"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import AnimatedNumber from "./AnimatedNumber";
import type { Range } from "@/lib/market-planning/types";
import { fmtAedRange, fmtLeadsRange } from "@/lib/market-planning/format";
import v from "./viz.module.css";

/** Blue ramp for allocation segments (one hue, so colour never needs a legend of 9 hues). */
export const RAMP = ["#14308f", "#2a56df", "#4f7af0", "#7b9bf4", "#a3b9f8", "#c6d4fb", "#dde6fd"];
export const rampColor = (i: number) => RAMP[Math.min(i, RAMP.length - 1)];

export type Segment = {
  key: string;
  label: string;
  /** Fraction of the whole, 0..1. */
  value: number;
  color: string;
  detail?: string;
  /** Text colour for the inline label (defaults to white). */
  textColor?: string;
};

/** One proportional bar. Segments grow in on load and animate on every change.
 *  Clickable when onSelect is given. With `inlineLabels`, wide segments show their name and percent. */
export function SplitBar({
  segments,
  height = 14,
  activeKey,
  onSelect,
  ariaLabel,
  inlineLabels = false,
}: {
  segments: Segment[];
  height?: number;
  activeKey?: string | null;
  onSelect?: (key: string) => void;
  ariaLabel: string;
  inlineLabels?: boolean;
}) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className={v.splitBar} style={{ height }} role="group" aria-label={ariaLabel}>
      {visible.map((s, i) => {
        const dim = activeKey && activeKey !== s.key;
        const title = `${s.label}: ${Math.round(s.value * 100)}%${s.detail ? ` · ${s.detail}` : ""}`;
        const common = {
          className: `${v.seg} ${onSelect ? v.segButton : ""}`,
          style: { background: s.color, color: s.textColor ?? "#ffffff" },
          initial: { flexGrow: 0, opacity: 0 },
          animate: { flexGrow: s.value, opacity: dim ? 0.3 : 1 },
          transition: { duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
          title,
        };
        const text =
          inlineLabels && s.value >= 0.13 ? (
            <span className={v.segText}>
              {s.label} <b>{Math.round(s.value * 100)}%</b>
            </span>
          ) : null;
        return onSelect ? (
          <motion.button key={s.key} type="button" {...common} aria-label={title} aria-pressed={activeKey === s.key} onClick={() => onSelect(s.key)}>
            {text}
          </motion.button>
        ) : (
          <motion.span key={s.key} {...common}>
            {text}
          </motion.span>
        );
      })}
    </div>
  );
}

/** A range value: animated when exact, plain text when it is a range or open-ended. */
export function LiveRange({
  range,
  kind,
  fallback = "Not yet validated",
  fromZero = false,
}: {
  range: Range;
  kind: "aed" | "leads";
  fallback?: ReactNode;
  /** Count up from zero when first shown. */
  fromZero?: boolean;
}) {
  const text = kind === "aed" ? fmtAedRange(range) : fmtLeadsRange(range);
  if (text === null) return <span className={v.unknown}>{fallback}</span>;
  const exact = range.lo !== null && range.hi !== null && Math.round(range.lo) === Math.round(range.hi);
  if (exact) {
    return <AnimatedNumber value={range.hi as number} kind={kind === "aed" ? "aed" : "int"} fromZero={fromZero} />;
  }
  // Ranges and open-ended values count too, so every headline number has the same counter feel.
  const num = (n: number, k: "aed" | "int") => <AnimatedNumber value={Math.round(n)} kind={k} fromZero={fromZero} />;
  const k = kind === "aed" ? "aed" : "int";
  if (range.lo === null) return <>up to {num(range.hi as number, k)}</>;
  if (range.hi === null) return kind === "aed" ? <>{num(range.lo, "aed")} or more</> : <>{num(range.lo, "int")}+</>;
  return kind === "aed" ? (
    <>
      AED {num(range.lo, "int")}–{num(range.hi, "int")}
    </>
  ) : (
    <>
      {num(range.lo, "int")}–{num(range.hi, "int")}
    </>
  );
}

/** Horizontal bar with a label, used for comparisons (maturity, regions). */
export function MeterRow({
  label,
  value,
  max,
  display,
  tone = "blue",
  dashed,
}: {
  label: string;
  value: number;
  max: number;
  display: ReactNode;
  tone?: "blue" | "navy" | "soft";
  dashed?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={v.meterRow}>
      <span className={v.meterLabel}>{label}</span>
      <span className={`${v.meterTrack} ${dashed ? v.meterDashed : ""}`}>
        <span className={`${v.meterFill} ${v[tone]}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={v.meterValue}>{display}</span>
    </div>
  );
}
