"use client";

import { useState } from "react";
import { usePlanner } from "../market-planning/planner-context";
import { validateCloseRate } from "@/lib/market-planning/sales";
import ui from "../market-planning/ui.module.css";
import v from "./v2.module.css";

/** The base close-rate field (the anchor each market's own close rate is scaled from). Lives in Data & assumptions. */
export function RateField() {
  const { state, dispatch } = usePlanner();
  const [text, setText] = useState<string | null>(null);
  const shown = Math.round(state.closeRate * 1000) / 10;
  const parsed = text === null ? state.closeRate : Number(text.replace(",", ".")) / 100;
  const check = validateCloseRate(text === null ? state.closeRate : Number.isFinite(parsed) ? parsed : null);
  return (
    <>
      <div className={v.rateRow}>
        <label className={v.rateInput}>
          <span className={v.srOnly}>Close rate in percent</span>
          <input
            inputMode="decimal"
            value={text ?? String(shown)}
            aria-invalid={!check.ok}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value.replace(",", ".")) / 100;
              if (validateCloseRate(n).ok) dispatch({ type: "setCloseRate", rate: n });
            }}
            onBlur={() => setText(null)}
          />
          <span>%</span>
        </label>
        <input
          type="range"
          className={ui.slider}
          min={0.5}
          max={10}
          step={0.1}
          value={Math.min(10, Math.max(0.5, shown))}
          aria-label="Close-rate assumption"
          aria-valuetext={`${shown} percent`}
          style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${((Math.min(10, Math.max(0.5, shown)) - 0.5) / 9.5) * 100}%, var(--mp-tint-2) ${((Math.min(10, Math.max(0.5, shown)) - 0.5) / 9.5) * 100}%)` }}
          onChange={(e) => {
            setText(null);
            dispatch({ type: "setCloseRate", rate: Number(e.target.value) / 100 });
          }}
        />
      </div>
      {!check.ok ? <span className={ui.fieldError} role="alert">{check.message}</span> : null}
    </>
  );
}
