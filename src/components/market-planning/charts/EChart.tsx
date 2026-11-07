"use client";

import { useEffect, useRef, useState } from "react";
import type { EChartsCoreOption, ECharts } from "echarts/core";
import c from "./charts.module.css";

type Handler = (params: unknown) => void;

/** Thin ECharts wrapper: loads the library lazily, resizes with its container,
 *  and updates options in place so values animate between states. */
export default function EChart({
  option,
  height,
  ariaLabel,
  onEvents,
  prepare,
}: {
  option: EChartsCoreOption;
  height: number;
  ariaLabel: string;
  onEvents?: Record<string, Handler>;
  /** Runs once after the library loads, before the first render (e.g. registerMap). */
  prepare?: (echarts: typeof import("echarts/core")) => Promise<void> | void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const lib = useRef<typeof import("echarts/core") | null>(null);
  const latest = useRef({ option, onEvents });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latest.current = { option, onEvents };
  });

  // Create the chart once.
  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const { echarts } = await import("@/lib/market-planning/echarts-setup");
      if (prepare) await prepare(echarts);
      if (disposed || !host.current) return;
      lib.current = echarts;
      const inst = echarts.init(host.current, undefined, { renderer: "canvas" });
      chart.current = inst;
      inst.setOption(latest.current.option);
      const ev = latest.current.onEvents;
      // Handlers read the latest props, so they never act on stale state.
      if (ev) for (const name of Object.keys(ev)) inst.on(name, ((p: unknown) => latest.current.onEvents?.[name]?.(p)) as never);
      ro = new ResizeObserver(() => inst.resize());
      ro.observe(host.current);
      setReady(true);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
    // The chart instance is created once; option changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply new options (animates between states).
  useEffect(() => {
    chart.current?.setOption(option, { notMerge: false, lazyUpdate: false });
  }, [option, ready]);

  return (
    <div className={c.wrap} style={{ height }} role="img" aria-label={ariaLabel}>
      <div ref={host} className={c.canvas} />
      {!ready ? <div className={c.skeleton} aria-hidden="true" /> : null}
    </div>
  );
}
