"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";
import { Check, Minus, Plus, Target, Wallet } from "lucide-react";
import { usePlanner } from "../planner-context";
import SettingsDialog from "./SettingsDialog";
import { Num, NumRange } from "../../market-planning-v2/Num";
import { fmtAed, parseAmount } from "@/lib/market-planning/format";
import { LIMITS } from "@/lib/market-planning/model";
import ui from "../ui.module.css";
import m from "./settings.module.css";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** "10000" -> "10,000". Anything that is not plain digits is shown as typed. */
const withCommas = (text: string) => (/^\d+$/.test(text.replace(/,/g, "")) && text !== "" ? Number(text.replace(/,/g, "")).toLocaleString("en-US") : text);

/**
 * Budget and lead target in one place. Planning by lead target works the other way round: you say how many
 * leads you want each month and the planner works out the budget those leads need in your chosen markets.
 */
export default function BudgetSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, dispatch, plan, budgetPresets, leadPresets } = usePlanner();
  const input = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const isBudget = state.mode === "budget";
  const amount = parseAmount(state.amountText);
  const invalid = !plan.valid;

  const limits = isBudget ? LIMITS.budget : LIMITS.leads;
  // The slider covers the everyday range; larger values can still be typed.
  const sliderMin = isBudget ? 500 : 10;
  const sliderMax = isBudget ? 50_000 : 1_000;
  const sliderStep = isBudget ? 500 : 10;
  const step = isBudget ? ((amount ?? 0) >= 20_000 ? 1_000 : 500) : (amount ?? 0) >= 200 ? 25 : 10;
  const value = clamp(amount ?? sliderMin, sliderMin, sliderMax);
  const pctFill = ((value - sliderMin) / (sliderMax - sliderMin)) * 100;
  const marks = isBudget ? [5_000, 10_000, 25_000, 50_000] : [100, 250, 500, 1_000];

  // Keep the caret where the user was typing even though commas are inserted.
  useLayoutEffect(() => {
    const el = input.current;
    if (caretDigits.current === null || !el) return;
    let pos = 0;
    let seen = 0;
    while (pos < el.value.length && seen < caretDigits.current) {
      if (/\d/.test(el.value[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  });

  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value;
    const caret = e.currentTarget.selectionStart ?? raw.length;
    caretDigits.current = raw.slice(0, caret).replace(/\D/g, "").length;
    const digits = raw.replace(/\D/g, "");
    dispatch({ type: "setAmountText", text: digits ? Number(digits).toLocaleString("en-US") : "" });
  };

  const set = (v: number) => dispatch({ type: "setAmount", value: Math.round(clamp(v, limits.min, limits.max)) });
  const nudge = (dir: 1 | -1) => set((amount ?? sliderMin) + dir * step);
  const presets = isBudget ? budgetPresets : leadPresets;
  const onPreset = isBudget ? budgetPresets?.some((p) => p.budget === amount) : leadPresets?.some((p) => p.target === amount);

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Budget"
      lead={isBudget ? "Set the monthly advertising budget. We estimate the leads it can bring." : "Set the leads you want each month. We work out the budget they need."}
      footer={
        <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
          Done
        </button>
      }
    >
      <div className={m.modeSwitch} role="radiogroup" aria-label="What do you want to set?">
        {(
          [
            { id: "budget", label: "Plan by budget", Icon: Wallet },
            { id: "leads", label: "Plan by lead target", Icon: Target },
          ] as const
        ).map(({ id, label, Icon }) => {
          const on = state.mode === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} className={`${m.modeBtn} ${on ? m.modeOn : ""}`} onClick={() => dispatch({ type: "setMode", mode: id })}>
              {on ? <motion.span layoutId="budget-mode-pill" className={m.modePill} transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <span className={m.modeText}>
                <Icon size={16} aria-hidden="true" />
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`${m.amountCard} ${invalid && state.amountText !== "" ? m.amountInvalid : ""}`}>
        <span className={m.amountLabel}>{isBudget ? "Monthly advertising budget" : "Monthly lead target"}</span>
        <div className={m.amountRow}>
          <button type="button" className={m.roundBtn} aria-label={`Decrease by ${step}`} onClick={() => nudge(-1)} disabled={(amount ?? 0) <= limits.min}>
            <Minus size={18} aria-hidden="true" />
          </button>
          <label className={m.amountField}>
            {isBudget ? <span className={m.amountUnit}>AED</span> : null}
            <input
              ref={input}
              className={m.amountInput}
              inputMode="numeric"
              autoComplete="off"
              aria-label={isBudget ? "Monthly budget in AED" : "Monthly lead target"}
              aria-invalid={invalid}
              value={withCommas(state.amountText)}
              onFocus={(e) => e.currentTarget.select()}
              onChange={onType}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  nudge(1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  nudge(-1);
                }
              }}
            />
            <span className={m.amountUnit}>{isBudget ? "/ month" : "leads / month"}</span>
          </label>
          <button type="button" className={m.roundBtn} aria-label={`Increase by ${step}`} onClick={() => nudge(1)} disabled={(amount ?? 0) >= limits.max}>
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={m.sliderWrap}>
          <input
            type="range"
            className={ui.slider}
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={value}
            aria-label={isBudget ? "Monthly budget slider" : "Monthly lead target slider"}
            style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${pctFill}%, var(--mp-tint-2) ${pctFill}%)` }}
            onChange={(e) => set(Number(e.target.value))}
          />
          <div className={m.sliderMarks} aria-hidden="true">
            {marks.map((mk) => (
              <button key={mk} type="button" className={m.sliderMark} style={{ left: `${((mk - sliderMin) / (sliderMax - sliderMin)) * 100}%` }} tabIndex={-1} onClick={() => set(mk)}>
                {isBudget ? `${mk / 1000}k` : mk}
              </button>
            ))}
          </div>
        </div>

        {invalid && state.amountText !== "" ? (
          <p className={m.amountError} role="alert">
            {plan.message}
          </p>
        ) : (
          <p className={m.amountHint}>
            {isBudget ? `${fmtAed(LIMITS.budget.min)} to ${fmtAed(LIMITS.budget.max)} · type, use ↑ ↓ or drag` : `Up to ${LIMITS.leads.max.toLocaleString("en-US")} leads · type, use ↑ ↓ or drag`}
          </p>
        )}
      </div>

      <div>
        <p className={m.label}>Quick picks</p>
        {presets ? (
          <div className={m.presets} role="group" aria-label="Suggested levels">
            {isBudget && budgetPresets
              ? budgetPresets.map((p) => {
                  const on = amount === p.budget;
                  return (
                    <button key={p.id} type="button" className={`${m.preset} ${on ? m.presetOn : ""}`} aria-pressed={on} onClick={() => dispatch({ type: "setAmount", value: p.budget })}>
                      {p.id === "recommended" ? <span className={m.presetTag}>Recommended</span> : p.id === "entry" ? <span className={m.presetTag}>Minimum</span> : null}
                      {on ? <Check size={14} className={m.presetCheck} aria-hidden="true" /> : null}
                      <span className={m.presetVal}>
                        <Num value={p.budget} kind="int" />
                      </span>
                      <span className={m.presetSub}>
                        ≈ <NumRange range={p.leads} /> leads
                      </span>
                    </button>
                  );
                })
              : leadPresets?.map((p) => {
                  const on = amount === p.target;
                  return (
                    <button key={p.id} type="button" className={`${m.preset} ${on ? m.presetOn : ""}`} aria-pressed={on} onClick={() => dispatch({ type: "setAmount", value: p.target })}>
                      {p.id === "recommended" ? <span className={m.presetTag}>Recommended</span> : null}
                      {on ? <Check size={14} className={m.presetCheck} aria-hidden="true" /> : null}
                      <span className={m.presetVal}>
                        <Num value={p.target} kind="int" /> leads
                      </span>
                      <span className={m.presetSub}>
                        needs <NumRange range={p.budget} money />
                      </span>
                    </button>
                  );
                })}
            <button type="button" className={`${m.preset} ${amount !== null && !onPreset ? m.presetOn : ""}`} onClick={() => input.current?.focus()}>
              {amount !== null && !onPreset ? <Check size={14} className={m.presetCheck} aria-hidden="true" /> : null}
              <span className={m.presetVal}>Custom</span>
              <span className={m.presetSub}>type any value</span>
            </button>
          </div>
        ) : (
          <p className={m.hint}>Add a market with a cost per lead to see quick picks.</p>
        )}
      </div>

    </SettingsDialog>
  );
}
