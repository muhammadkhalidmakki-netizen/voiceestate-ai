"use client";

import { RotateCcw } from "lucide-react";
import { usePlanner } from "./planner-context";
import HistoryMenu from "../market-planning-v2/HistoryMenu";
import SavedPlansMenu from "../market-planning-v2/SavedPlansMenu";
import ShareButton from "../market-planning-v2/ShareButton";
import v from "../market-planning-v2/v2.module.css";
import s from "./market-planning.module.css";

/** Plan tools that stay in reach while you scroll: saved plans, undo, reset and the share link, on a small white pill. */
export default function LiveBar({ hidden = false, notify }: { hidden?: boolean; notify: (m: string) => void }) {
  const { dispatch, customized } = usePlanner();
  return (
    <div className={`${s.liveBar} ${hidden ? s.liveBarHidden : ""}`} role="region" aria-label="Plan tools" aria-hidden={hidden || undefined}>
      <SavedPlansMenu notify={notify} compact />
      <ShareButton notify={notify} compact />
      <HistoryMenu compact />
      <button type="button" className={`${v.ghostBtn} ${customized ? v.ghostBtnAlert : ""}`} onClick={() => dispatch({ type: "restore" })} disabled={!customized} aria-label="Reset to the recommended plan" title="Reset to the recommended plan">
        <RotateCcw size={15} aria-hidden="true" /> Reset
      </button>
    </div>
  );
}
