"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { fmtAed, fmtInt } from "@/lib/market-planning/format";

const FORMAT = {
  aed: (n: number) => fmtAed(Math.round(n)),
  int: (n: number) => fmtInt(Math.round(n)),
  /** A fraction (0..1) shown as a whole percent. */
  pct: (n: number) => `${Math.round(n * 100)}%`,
  /** A fraction (0..1) shown with one decimal. */
  pct1: (n: number) => `${(n * 100).toFixed(1)}%`,
  dec1: (n: number) => n.toFixed(1),
} as const;

export type NumKind = keyof typeof FORMAT;

/** Counts smoothly from the previous value to the new one (Motion). Respects reduced motion.
 *  The animated text is aria-hidden; screen readers get the final value only. */
export default function AnimatedNumber({
  value,
  kind,
  duration = 0.5,
  fromZero = false,
}: {
  value: number;
  kind: NumKind;
  duration?: number;
  /** Count up from zero when first shown, for a counter feel on load. */
  fromZero?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [initial] = useState(fromZero ? 0 : value); // React never re-renders the animated text
  const current = useRef(initial);
  const reduced = useReducedMotion();
  const format = FORMAT[kind];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || current.current === value) {
      current.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        current.current = v;
        el.textContent = format(v);
      },
      onComplete: () => {
        current.current = value;
        el.textContent = format(value);
      },
    });
    return () => controls.stop();
  }, [value, duration, format, reduced]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {format(initial)}
      </span>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {format(value)}
      </span>
    </>
  );
}
