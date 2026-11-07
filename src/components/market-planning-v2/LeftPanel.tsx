"use client";

import { useRef, useState } from "react";
import { Wallet, Target, X, RotateCcw } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import MarketPicker from "../market-planning/builder/MarketPicker";
import LanguagePicker from "../market-planning/builder/LanguagePicker";
import { Num, NumRange } from "./Num";
import Sheet from "./Sheet";
import { LANGUAGE_OPTIONS } from "@/lib/market-planning/catalog";
import { parseAmount } from "@/lib/market-planning/format";
import { LIMITS } from "@/lib/market-planning/model";
import { fmtAed } from "@/lib/market-planning/format";
import ui from "../market-planning/ui.module.css";
import v from "./v2.module.css";

const MAX_CHIPS = 5;

function StepHead({ n, title }: { n: number; title: string }) {
  return (
    <h3 className={v.stepHead}>
      <span className={v.stepNum}>{n}</span>
      {title}
    </h3>
  );
}

export default function LeftPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { state, dispatch, plan, budgetPresets, leadPresets, rows, pct, channel, openDetail, customized } = usePlanner();
  const [sheet, setSheet] = useState<null | "markets" | "languages">(null);
  const [showShares, setShowShares] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const isBudget = state.mode === "budget";
  const amount = parseAmount(state.amountText);
  const meta = Math.round(state.metaShare * 100);
  const invalid = !plan.valid;
  const presets = isBudget ? budgetPresets : leadPresets;
  const selectedLangs = LANGUAGE_OPTIONS.filter((l) => state.languages[l.code]);
  const sorted = [...rows].sort((a, b) => b.share - a.share);

  return (
    <aside className={v.left} aria-label="Strategy builder">
      <button type="button" className={v.leftToggle} aria-expanded={open} aria-controls="v2-left-body" onClick={onToggle}>
        <span>Build your market strategy</span>
        <span className={v.leftToggleHint}>{open ? "Hide" : "Edit"}</span>
      </button>
      <h2 className={v.leftTitle}>Build your market strategy</h2>
      <p className={v.leftSub}>Every change updates the forecast instantly.</p>
      <button
        type="button"
        className={customized ? ui.btnPrimary : ui.btnLine}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "4px 0 12px" }}
        disabled={!customized}
        onClick={() => dispatch({ type: "restore" })}
      >
        <RotateCcw size={15} aria-hidden="true" />
        {customized ? "Restore recommended plan" : "Recommended plan active"}
      </button>

      <div id="v2-left-body" className={open ? v.leftBody : v.leftClosed}>
        {/* 1 · Investment goal */}
        <section className={v.step} aria-label="Investment goal">
          <StepHead n={1} title="Investment goal" />
          <div className={ui.segmented} role="radiogroup" aria-label="Planning mode" style={{ width: "100%" }}>
            <button type="button" role="radio" aria-checked={isBudget} className={ui.segment} onClick={() => dispatch({ type: "setMode", mode: "budget" })}>
              <Wallet size={15} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Plan by budget
            </button>
            <button type="button" role="radio" aria-checked={!isBudget} className={ui.segment} onClick={() => dispatch({ type: "setMode", mode: "leads" })}>
              <Target size={15} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Plan by lead target
            </button>
          </div>

          <span className={v.miniLabel}>{isBudget ? "Monthly advertising budget (AED)" : "Monthly lead target"}</span>
          {presets ? (
            <div className={v.presets} role="group" aria-label="Suggested planning levels">
              {isBudget && budgetPresets
                ? budgetPresets.map((p) => {
                    const on = amount === p.budget;
                    return (
                      <button key={p.id} type="button" className={`${v.preset} ${on ? v.presetOn : ""}`} aria-pressed={on} onClick={() => dispatch({ type: "setAmount", value: p.budget })}>
                        {p.id === "recommended" ? <span className={v.presetTag}>Recommended</span> : p.id === "entry" ? <span className={v.presetTag}>Minimum</span> : null}
                        <span className={v.presetVal}><Num value={p.budget} kind="int" /></span>
                        <span className={v.presetSub}>≈ <NumRange range={p.leads} /> leads</span>
                      </button>
                    );
                  })
                : leadPresets?.map((p) => {
                    const on = amount === p.target;
                    return (
                      <button key={p.id} type="button" className={`${v.preset} ${on ? v.presetOn : ""}`} aria-pressed={on} onClick={() => dispatch({ type: "setAmount", value: p.target })}>
                        {p.id === "recommended" ? <span className={v.presetTag}>Recommended</span> : null}
                        <span className={v.presetVal}><Num value={p.target} kind="int" /> leads</span>
                        <span className={v.presetSub}>needs <NumRange range={p.budget} money /></span>
                      </button>
                    );
                  })}
              <button
                type="button"
                className={`${v.preset} ${amount !== null && !(isBudget ? budgetPresets?.some((p) => p.budget === amount) : leadPresets?.some((p) => p.target === amount)) ? v.presetOn : ""}`}
                onClick={() => input.current?.focus()}
              >
                <span className={v.presetVal}>Custom</span>
                <span className={v.presetSub}>enter any value</span>
              </button>
            </div>
          ) : (
            <p className={ui.subtle}>Add a market with a CPL benchmark to see suggested levels.</p>
          )}

          <label className={ui.field} style={{ marginTop: 10, display: "block" }}>
            <span className={`${ui.inputWrap} ${invalid && state.amountText !== "" ? ui.inputInvalid : ""}`}>
              {isBudget ? <span className={ui.affix}>AED</span> : null}
              <input
                ref={input}
                className={ui.input}
                inputMode="numeric"
                autoComplete="off"
                aria-label={isBudget ? "Monthly budget in AED" : "Monthly lead target"}
                aria-invalid={invalid}
                value={state.amountText}
                onChange={(e) => dispatch({ type: "setAmountText", text: e.target.value })}
              />
              <span className={ui.affix}>{isBudget ? "/ month" : "leads / month"}</span>
            </span>
            {invalid ? (
              <span className={ui.fieldError} role="alert">{plan.message}</span>
            ) : (
              <span className={ui.subtle} style={{ display: "block", marginTop: 6 }}>
                {isBudget ? `${fmtAed(LIMITS.budget.min)} to ${fmtAed(LIMITS.budget.max)}, advertising spend only` : `Up to ${LIMITS.leads.max.toLocaleString("en-US")} raw enquiries`}
              </span>
            )}
          </label>
        </section>

        {/* 2 · Markets and languages */}
        <section className={v.step} aria-label="Target markets and languages">
          <StepHead n={2} title="Target markets & languages" />
          <div className={v.rowBetween}>
            <span className={v.miniLabel} style={{ margin: 0 }}>Selected markets ({rows.length})</span>
            <button type="button" className={v.linkBtn} onClick={() => setSheet("markets")}>Edit markets</button>
          </div>
          <div className={v.chips} style={{ marginTop: 8 }}>
            {sorted.slice(0, MAX_CHIPS).map((r) => (
              <button
                key={r.iso2}
                type="button"
                className={`${v.monogram} ${r.cpl ? "" : v.monogramPending}`}
                title={`${r.country.name}${r.cpl ? "" : " · CPL research pending"}`}
                aria-label={`${r.country.name}: open details`}
                onClick={() => openDetail({ kind: "country", iso2: r.iso2 })}
              >
                {r.iso2}
              </button>
            ))}
            {sorted.length > MAX_CHIPS ? (
              <button type="button" className={`${v.monogram} ${v.monogramMore}`} onClick={() => setSheet("markets")} aria-label={`${sorted.length - MAX_CHIPS} more markets`}>
                +{sorted.length - MAX_CHIPS}
              </button>
            ) : null}
          </div>

          <div className={v.rowBetween} style={{ marginTop: 14 }}>
            <span className={v.miniLabel} style={{ margin: 0 }}>Agent languages ({selectedLangs.length})</span>
            <button type="button" className={v.linkBtn} onClick={() => setSheet("languages")}>{selectedLangs.length ? "Edit" : "Add"}</button>
          </div>
          <div className={v.chips} style={{ marginTop: 8 }}>
            {selectedLangs.length === 0 ? (
              <span className={ui.subtle}>None yet. Languages unlock matching markets.</span>
            ) : (
              selectedLangs.map((l) => (
                <span key={l.code} className={v.langChip}>
                  {l.code === "other" ? "Other" : l.label}
                  <button type="button" className={v.langX} aria-label={`Remove ${l.label}`} onClick={() => dispatch({ type: "toggleLanguage", code: l.code })}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

        {/* 3 · Channels and market shares */}
        <section className={v.step} aria-label="Channel and budget allocation">
          <StepHead n={3} title="Channel & budget allocation" />
          <input
            type="range"
            className={ui.slider}
            min={0}
            max={100}
            step={1}
            value={meta}
            aria-label="Meta Ads share of the budget; Google takes the rest"
            aria-valuetext={`Meta ${meta} percent, Google ${100 - meta} percent`}
            style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${meta}%, var(--mp-tint-2) ${meta}%)` }}
            onChange={(e) => dispatch({ type: "setMeta", share: Number(e.target.value) / 100 })}
          />
          <div className={v.channelCards}>
            <button type="button" className={v.channelCard} style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => openDetail({ kind: "channel", channel: "meta" })}>
              <span className={v.channelName}>Meta Ads</span>
              <span className={v.channelPct}><Num value={state.metaShare} kind="pct" /></span>
              <span className={v.channelAed}><NumRange range={channel.meta} money fallback="Set a budget" /></span>
            </button>
            <button type="button" className={v.channelCard} style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => openDetail({ kind: "channel", channel: "google" })}>
              <span className={v.channelName}>Google Ads</span>
              <span className={v.channelPct}><Num value={1 - state.metaShare} kind="pct" /></span>
              <span className={v.channelAed}><NumRange range={channel.google} money fallback="Set a budget" /></span>
            </button>
          </div>

          <div className={v.rowBetween} style={{ marginTop: 14 }}>
            <button type="button" className={v.linkBtn} aria-expanded={showShares} onClick={() => setShowShares((s) => !s)}>
              {showShares ? "Hide" : "Adjust"} budget by market
            </button>
            {showShares ? (
              <button type="button" className={v.linkBtn} onClick={() => dispatch({ type: "equalizeShares" })}>Equal split</button>
            ) : null}
          </div>
          {showShares ? (
            <ul className={v.shareRows}>
              {sorted.map((r) => {
                const p = pct[r.iso2] ?? 0;
                return (
                  <li key={r.iso2} className={v.shareRow}>
                    <span className={v.shareName}>{r.country.name}</span>
                    <input
                      type="range"
                      className={ui.slider}
                      min={0}
                      max={100}
                      step={1}
                      value={p}
                      aria-label={`${r.country.name} share of budget`}
                      style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${p}%, var(--mp-tint-2) ${p}%)` }}
                      onChange={(e) => dispatch({ type: "setShare", iso2: r.iso2, share: Number(e.target.value) / 100 })}
                    />
                    <span className={v.sharePct}><Num value={p / 100} kind="pct" /></span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </div>

      <Sheet open={sheet === "markets"} onOpenChange={(o) => setSheet(o ? "markets" : null)} title="Target markets">
        <MarketPicker />
      </Sheet>
      <Sheet open={sheet === "languages"} onOpenChange={(o) => setSheet(o ? "languages" : null)} title="Agent languages">
        <LanguagePicker />
      </Sheet>
    </aside>
  );
}
