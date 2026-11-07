"use client";

import { ArrowLeft } from "lucide-react";
import { usePlanner } from "../planner-context";
import SettingsDialog from "./SettingsDialog";
import Flag from "./Flag";
import { Num } from "../../market-planning-v2/Num";
import ui from "../ui.module.css";
import m from "./settings.module.css";

/** Divide the budget between the selected markets: drag a slider, or use an equal split. */
export default function SplitSettings({
  open,
  onOpenChange,
  onBack,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onBack: () => void;
}) {
  const { dispatch, rows, pct, state } = usePlanner();
  const sorted = [...rows].sort((a, b) => b.share - a.share);

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Budget by market"
      lead="Decide how much of the budget each market gets. The shares always add up to 100%: moving one adjusts the others."
      footer={
        <>
          <button type="button" className={m.btnSecondary} onClick={onBack}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to markets
          </button>
          <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
            Done
          </button>
        </>
      }
    >
      <div className={m.actionsRow}>
        <button type="button" className={ui.btnLine} onClick={() => dispatch({ type: "equalizeShares" })}>
          Equal split
        </button>
        <button type="button" className={ui.btnLine} onClick={() => dispatch({ type: "resetMarkets" })} title="Go back to the recommended markets and split">
          Use recommended split
        </button>
        {state.selection === "recommended" ? <span className={m.hint}>Recommended by the planner</span> : <span className={m.hint}>Your own selection</span>}
      </div>

      <ul className={m.splitList}>
        {sorted.map((r) => {
          const p = pct[r.iso2] ?? 0;
          return (
            <li key={r.iso2} className={m.splitRow}>
              <span className={m.splitName}>
                <Flag iso2={r.iso2} name={r.country.name} />
                {r.country.name}
              </span>
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
              <span className={m.splitPct}>
                <Num value={p / 100} kind="pct" />
              </span>
            </li>
          );
        })}
      </ul>
    </SettingsDialog>
  );
}
