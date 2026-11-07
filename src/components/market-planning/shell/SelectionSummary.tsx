"use client";

import { useState } from "react";
import { Pencil, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { usePlanner } from "../planner-context";
import AnimatedNumber from "../AnimatedNumber";
import { LiveRange } from "../viz";
import Flag from "../settings/Flag";
import { GoogleLogo, MetaLogo } from "../settings/Logos";
import BudgetSettings from "../settings/BudgetSettings";
import MarketSettings from "../settings/MarketSettings";
import SplitSettings from "../settings/SplitSettings";
import LanguageSettings from "../settings/LanguageSettings";
import ChannelSettings from "../settings/ChannelSettings";
import { LANGUAGE_OPTIONS } from "@/lib/market-planning/catalog";
import { parseAmount } from "@/lib/market-planning/format";
import s from "./hero.module.css";

const MAX_MARKETS = 8;

type Panel = null | "budget" | "markets" | "split" | "languages" | "channels";

function Gear({ label, onClick }: { label: string; onClick: () => void }) {
  const { readOnly } = usePlanner();
  if (readOnly) return null;
  return (
    <button type="button" className={s.selEdit} aria-label={label} title={label} onClick={onClick}>
      <Pencil size={13} aria-hidden="true" />
      Edit
    </button>
  );
}

/**
 * The plan's control centre: a live summary of what is selected (budget or lead target, markets, languages,
 * channels). Each row has a settings button that opens its own popup, so the page needs no separate builder.
 * Nothing here is stored: it is read from the planner state, so it changes the moment any setting does.
 */
export default function SelectionSummary({ countUp = true }: { countUp?: boolean }) {
  const { state, plan, rows, pct, dispatch, channel, openDetail, customized, readOnly } = usePlanner();
  const [panel, setPanel] = useState<Panel>(null);
  const [showAll, setShowAll] = useState(false);
  const isBudget = state.mode === "budget";
  const amount = parseAmount(state.amountText);
  const markets = [...rows].sort((a, b) => b.share - a.share);
  const shown = showAll ? markets : markets.slice(0, MAX_MARKETS);
  const langCodes = Object.keys(state.languages);
  const metaPct = Math.round(state.metaShare * 100);
  const googlePct = 100 - metaPct;
  const langLabel = (code: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;
  const close = (p: Exclude<Panel, null>) => (o: boolean) => setPanel(o ? p : null);

  return (
    <section className={s.sel} aria-label="Your selections">
      <header className={s.selHead}>
        <h2 className={s.selTitle}>Your selections</h2>
        <span className={s.selHeadEnd}>
          {readOnly ? null : <button
            type="button"
            className={`${s.selReset} ${customized ? s.selResetOn : ""}`}
            disabled={!customized}
            onClick={() => dispatch({ type: "restore" })}
            aria-label="Reset to the recommended plan"
            title="Reset to the recommended plan (English, AED 10,000, recommended markets)"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset
          </button>}
          <span className={s.selLive}>
            <span className={s.selPulse} aria-hidden="true" />
            Live
          </span>
        </span>
      </header>

      <div className={s.selRow}>
        <div className={s.selRowHead}>
          <span className={s.selLabel}>{isBudget ? "Monthly budget" : "Monthly lead target"}</span>
          <Gear label="Change budget or lead target" onClick={() => setPanel("budget")} />
        </div>
        <div className={s.selBody}>
          {amount !== null && plan.valid ? (
            <p className={s.selBig}>
              {isBudget ? <AnimatedNumber value={amount} kind="aed" fromZero={countUp} /> : <><AnimatedNumber value={amount} kind="int" fromZero={countUp} /> leads</>}
              <span className={s.selUnit}> / month</span>
            </p>
          ) : (
            <p className={s.selBig}>—</p>
          )}
          {!isBudget && plan.valid ? (
            <p className={s.selSub}>
              needs about <LiveRange range={plan.budget} kind="aed" fallback="—" fromZero={countUp} />
            </p>
          ) : null}
        </div>
      </div>

      <div className={s.selRow}>
        <div className={s.selRowHead}>
          <span className={s.selLabel}>
            Markets <span className={s.selCount}>{markets.length}</span>
          </span>
          <Gear label="Change markets" onClick={() => setPanel("markets")} />
        </div>
        <ul className={s.selChips} aria-label="Selected markets">
          {shown.map((r) => (
            <li key={r.iso2} className={s.selChip}>
              <Flag iso2={r.iso2} name={r.country.name} />
              <span className={s.selName}>{r.country.name}</span>
              <span className={s.selPct}>{pct[r.iso2] ?? 0}%</span>
              <button
                type="button"
                className={s.selX}
                aria-label={`Remove ${r.country.name}`}
                hidden={readOnly}
                disabled={markets.length <= 1}
                onClick={() => dispatch({ type: "toggleMarket", iso2: r.iso2 })}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
          {markets.length > MAX_MARKETS ? (
            <li>
              <button type="button" className={s.selMore} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? "Show fewer" : `+${markets.length - MAX_MARKETS} more`}
              </button>
            </li>
          ) : null}
        </ul>
        {readOnly ? null : <button type="button" className={s.selAction} onClick={() => setPanel("split")}>
          <SlidersHorizontal size={14} aria-hidden="true" />
          Budget by market
        </button>}
      </div>

      <div className={s.selRow}>
        <div className={s.selRowHead}>
          <span className={s.selLabel}>
            Agent languages <span className={s.selCount}>{langCodes.length}</span>
          </span>
          <Gear label="Change agent languages" onClick={() => setPanel("languages")} />
        </div>
        <ul className={s.selChips} aria-label="Selected agent languages">
          {langCodes.map((code) => (
            <li key={code} className={s.selChip}>
              <span className={s.selName}>{langLabel(code)}</span>
              <button
                type="button"
                className={s.selX}
                aria-label={`Remove ${langLabel(code)}`}
                hidden={readOnly}
                disabled={langCodes.length <= 1}
                onClick={() => dispatch({ type: "toggleLanguage", code })}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.selRow}>
        <div className={s.selRowHead}>
          <span className={s.selLabel}>Channels</span>
          <Gear label="Change the Meta and Google split" onClick={() => setPanel("channels")} />
        </div>
        <div className={s.selSplit} role="group" aria-label="Meta and Google share of the budget">
          {metaPct > 0 ? (
            <button type="button" className={s.selSegMeta} style={{ width: `${metaPct}%` }} onClick={() => openDetail({ kind: "channel", channel: "meta" })} aria-label={`Meta Ads, ${metaPct} percent of the budget: open details`} title="Meta Ads: open details">
              {metaPct >= 14 ? <MetaLogo size={18} white /> : null}
              {metaPct >= 14 ? <span className={s.selSegPct}>{metaPct}%</span> : null}
              {metaPct >= 30 ? (
                <span className={s.selSegAmt}>
                  <LiveRange range={channel.meta} kind="aed" fallback="—" fromZero={countUp} />
                </span>
              ) : null}
            </button>
          ) : null}
          {googlePct > 0 ? (
            <button type="button" className={s.selSegGoogle} style={{ width: `${googlePct}%` }} onClick={() => openDetail({ kind: "channel", channel: "google" })} aria-label={`Google Ads, ${googlePct} percent of the budget: open details`} title="Google Ads: open details">
              {googlePct >= 14 ? (
                <span className={s.selSegG}>
                  <GoogleLogo size={14} />
                </span>
              ) : null}
              {googlePct >= 14 ? <span className={s.selSegPct}>{googlePct}%</span> : null}
              {googlePct >= 30 ? (
                <span className={s.selSegAmt}>
                  <LiveRange range={channel.google} kind="aed" fallback="—" fromZero={countUp} />
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      <BudgetSettings open={panel === "budget"} onOpenChange={close("budget")} />
      <MarketSettings open={panel === "markets"} onOpenChange={close("markets")} onSplit={() => setPanel("split")} />
      <SplitSettings open={panel === "split"} onOpenChange={close("split")} onBack={() => setPanel("markets")} />
      <LanguageSettings open={panel === "languages"} onOpenChange={close("languages")} />
      <ChannelSettings open={panel === "channels"} onOpenChange={close("channels")} />
    </section>
  );
}
