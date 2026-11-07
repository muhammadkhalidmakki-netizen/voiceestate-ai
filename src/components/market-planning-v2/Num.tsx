"use client";

import AnimatedNumber, { type NumKind } from "../market-planning/AnimatedNumber";
import type { Range } from "@/lib/market-planning/types";

/** A number that counts to its new value whenever it changes. */
export function Num({ value, kind = "int" }: { value: number; kind?: NumKind }) {
  return <AnimatedNumber value={value} kind={kind} fromZero />;
}

/** A range where every number counts. Open-ended highs show "+", unknown lows show a fallback. */
export function NumRange({
  range,
  money = false,
  fallback = "Not yet validated",
  kind,
}: {
  range: Range;
  money?: boolean;
  fallback?: React.ReactNode;
  kind?: NumKind;
}) {
  const k: NumKind = kind ?? (money ? "aed" : "int");
  const { lo, hi } = range;
  if (lo === null && hi === null) return <>{fallback}</>;
  if (lo === null) return <>up to <Num value={hi as number} kind={k} /></>;
  const same = hi !== null && Math.round(lo * 10) === Math.round(hi * 10);
  if (hi === null) return <><Num value={lo} kind={k} />+</>;
  if (same) return <Num value={hi} kind={k} />;
  return (
    <>
      <Num value={lo} kind={k} />–<Num value={hi} kind={k === "aed" ? "int" : k} />
    </>
  );
}
