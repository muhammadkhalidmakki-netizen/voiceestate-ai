"use client";

import { Link2, RotateCcw } from "lucide-react";
import { usePlanner } from "./planner-context";
import HistoryMenu from "../market-planning-v2/HistoryMenu";
import SavedPlansMenu from "../market-planning-v2/SavedPlansMenu";
import { copyPlanLink } from "../market-planning-v2/Header";
import v from "../market-planning-v2/v2.module.css";
import s from "./market-planning.module.css";

/** Plan tools that stay in reach while you scroll: saved plans, undo, reset and the share link, on a small white pill. */
export default function LiveBar({ hidden = false, notify }: { hidden?: boolean; notify: (m: string) => void }) {
  const { state, dispatch, customized } = usePlanner();
  return (
    <div className={`${s.liveBar} ${hidden ? s.liveBarHidden : ""}`} role="region" aria-label="Plan tools" aria-hidden={hidden || undefined}>
      <SavedPlansMenu notify={notify} compact />
      <HistoryMenu compact />
      <button type="button" className={`${v.ghostBtn} ${customized ? v.ghostBtnAlert : ""}`} onClick={() => dispatch({ type: "restore" })} disabled={!customized} aria-label="Reset to the recommended plan" title="Reset to the recommended plan">
        <RotateCcw size={15} aria-hidden="true" /> Reset
      </button>
      <button type="button" className={s.liveIcon} onClick={() => void copyPlanLink(state, notify)} aria-label="Copy share link" title="Copy a link to this plan">
        <Link2 size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
