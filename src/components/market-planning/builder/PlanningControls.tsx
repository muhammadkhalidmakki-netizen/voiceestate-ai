"use client";

import { LiveRange } from "../viz";
import { PanelHead, EvidencePill } from "../ui";
import { usePlanner } from "../planner-context";
import {
  fmtAed,
  fmtAedRange,
  fmtCplRange,
  fmtLeadsRange,
  parseAmount,
} from "@/lib/market-planning/format";
import { EUROPE_PATTERN } from "@/lib/market-planning/catalog";
import { LIMITS } from "@/lib/market-planning/model";
import ui from "../ui.module.css";
import b from "./builder.module.css";

export default function PlanningControls() {
  const { state, dispatch, plan, budgetPresets, leadPresets, rows } = usePlanner();
  const isBudget = state.mode === "budget";
  const amount = parseAmount(state.amountText);
  const hasEurope = rows.some((r) => r.country.benchmarkRegion === "Europe");
  const invalid = amount !== null ? !plan.valid : state.amountText.trim() === "" || !plan.valid;
  const label = isBudget ? "Enter a different budget" : "Set a custom lead target";

  return (
    <section aria-labelledby="plan-title" id="plan">
      <PanelHead
        id="plan-title"
        title="Build your market strategy"
        copy="Start with your monthly investment budget or the number of leads you want to generate. We'll help you build a market strategy around your goals."
      />

      <div className={b.modeRow} role="radiogroup" aria-label="Planning mode">
        <div className={ui.segmented} style={{ width: "100%" }}>
          <button
            type="button"
            role="radio"
            aria-checked={isBudget}
            className={ui.segment}
            onClick={() => dispatch({ type: "setMode", mode: "budget" })}
          >
            Plan by monthly budget
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isBudget}
            className={ui.segment}
            onClick={() => dispatch({ type: "setMode", mode: "leads" })}
          >
            Plan by lead target
          </button>
        </div>
      </div>

      <p className={b.groupLabel}>Suggested planning levels</p>
      {isBudget ? (
        budgetPresets ? (
          <div className={b.presets} role="group" aria-label="Suggested monthly budgets">
            {budgetPresets.map((p) => {
              const active = amount === p.budget;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${b.preset} ${active ? b.presetActive : ""}`}
                  aria-pressed={active}
                  onClick={() => dispatch({ type: "setAmount", value: p.budget })}
                >
                  <span className={b.presetName}>
                    {p.label}
                    {p.id === "recommended" ? <span className={b.presetTag}>Default</span> : null}
                  </span>
                  <span className={b.presetValue}>{fmtAed(p.budget)}</span>
                  <span className={b.presetSub}>
                    ≈ {fmtLeadsRange(p.leads)} leads / month
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className={b.empty}>Add a market with a CPL benchmark to see suggested budget levels.</p>
        )
      ) : leadPresets ? (
        <div className={b.presets} role="group" aria-label="Suggested monthly lead targets">
          {leadPresets.map((p) => {
            const active = amount === p.target;
            return (
              <button
                key={p.id}
                type="button"
                className={`${b.preset} ${active ? b.presetActive : ""}`}
                aria-pressed={active}
                onClick={() => dispatch({ type: "setAmount", value: p.target })}
              >
                <span className={b.presetName}>
                  {p.label}
                  {p.id === "recommended" ? <span className={b.presetTag}>Suggested</span> : null}
                </span>
                <span className={b.presetValue}>{p.target} leads</span>
                <span className={b.presetSub}>needs {fmtAedRange(p.budget)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={b.empty}>Add a market with a CPL benchmark to see suggested lead targets.</p>
      )}

      <label className={`${ui.field} ${b.custom}`}>
        <span className={ui.fieldLabel}>{label}</span>
        <span className={`${ui.inputWrap} ${invalid && state.amountText !== "" ? ui.inputInvalid : ""}`}>
          {isBudget ? <span className={ui.affix}>AED</span> : null}
          <input
            className={ui.input}
            inputMode="numeric"
            autoComplete="off"
            value={state.amountText}
            aria-invalid={invalid}
            aria-describedby="amount-help"
            onChange={(e) => dispatch({ type: "setAmountText", text: e.target.value })}
          />
          <span className={ui.affix}>{isBudget ? "/ month" : "leads / month"}</span>
        </span>
        <span id="amount-help" className={ui.fieldError} role={invalid ? "alert" : undefined} style={invalid ? undefined : { color: "var(--mp-ink-3)" }}>
          {invalid
            ? plan.message
            : isBudget
              ? `Between ${fmtAed(LIMITS.budget.min)} and ${fmtAed(LIMITS.budget.max)}. Advertising spend only.`
              : `Raw enquiries per month, up to ${LIMITS.leads.max.toLocaleString("en-US")}.`}
        </span>
      </label>

      {/* The calculated side of the plan: this is what the other mode would be if it were the input. */}
      <div className={b.readout} aria-live="polite">
        <div>
          <span className={b.readoutLabel}>
            {isBudget ? "Estimated leads" : "Estimated investment"}
          </span>
          <span className={b.readoutValue}>
            {plan.valid ? (
              <LiveRange
                range={isBudget ? plan.leads : plan.budget}
                kind={isBudget ? "leads" : "aed"}
                fallback="Add a market with a CPL"
              />
            ) : (
              <span style={{ color: "var(--mp-ink-3)" }}>Enter a valid amount</span>
            )}
          </span>
        </div>
        <div className={b.readoutMeta}>
          <EvidencePill kind={plan.usesAssumption ? "assumption" : "client"} />
          <span>
            {plan.coveredCount > 0 && fmtCplRange(plan.blendedCpl)
              ? `Blended CPL ${fmtCplRange(plan.blendedCpl)}`
              : "No CPL benchmark yet"}
          </span>
        </div>
      </div>

      <p className={b.note}>
        Suggested levels are planning scenarios from your selected markets&rsquo; benchmarks. They are
        not platform minimums or guaranteed results.
      </p>

      {hasEurope && isBudget ? (
        <div className={b.reference}>
          <p>
            <strong>Observed Europe setup:</strong> about AED {EUROPE_PATTERN.meta_daily_aed}/day on each
            platform ({fmtAed(EUROPE_PATTERN.total_monthly_aed)}/month in total over 30 days). A client
            observation, not a minimum or proof of an optimal split.
          </p>
          <button
            type="button"
            className={ui.btnLine}
            onClick={() => dispatch({ type: "setAmount", value: EUROPE_PATTERN.total_monthly_aed })}
          >
            Use {fmtAed(EUROPE_PATTERN.total_monthly_aed)}
          </button>
        </div>
      ) : null}
    </section>
  );
}
