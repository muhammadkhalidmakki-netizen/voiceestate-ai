"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { RotateCcw } from "lucide-react";
import { usePlanner } from "./planner-context";
import HistoryMenu from "../market-planning-v2/HistoryMenu";
import SavedPlansMenu from "../market-planning-v2/SavedPlansMenu";
import ShareButton from "../market-planning-v2/ShareButton";
import NewPlanButton from "../market-planning-v2/NewPlanButton";
import v from "../market-planning-v2/v2.module.css";
import h from "../market-planning-v2/insights-home.module.css";
import s from "./market-planning.module.css";

const PHONE = "(max-width: 719px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const usePhone = () => useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false);

/**
 * Plan tools that stay in reach. On a computer: a small white pill that appears once you scroll past the top.
 * On a phone: an app-style bar at the bottom (Plans, Undo, Share, Reset) that slides away while you scroll down and back on scroll up.
 */
export default function LiveBar({ hidden = false, notify }: { hidden?: boolean; notify: (m: string) => void }) {
  const { dispatch, customized } = usePlanner();
  const phone = usePhone();
  const [tuck, setTuck] = useState(false);

  useEffect(() => {
    if (!phone) return;
    let last = window.scrollY;
    let acc = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      last = y;
      acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
      if (acc > 60 && y > 160) setTuck(true);
      else if (acc < -20) setTuck(false);
    };
    // touching the bottom edge always brings the bar back
    const onDown = (e: PointerEvent) => {
      if (e.clientY > window.innerHeight - 110) setTuck(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [phone]);

  const off = phone ? false : hidden;
  return (
    <div className={`${s.liveBar} ${off ? s.liveBarHidden : ""} ${phone ? s.dock : ""} ${phone && tuck ? s.dockTucked : ""}`} role="region" aria-label="Plan tools" aria-hidden={off || undefined}>
      <SavedPlansMenu notify={notify} compact />
      <HistoryMenu compact />
      {phone ? <NewPlanButton notify={notify} /> : null}
      <ShareButton notify={notify} compact />
      <button type="button" className={`${v.ghostBtn} ${h.dockReset} ${customized ? v.ghostBtnAlert : ""}`} onClick={() => dispatch({ type: "restore" })} disabled={!customized} aria-label="Reset to the recommended plan" title="Reset to the recommended plan">
        <RotateCcw size={15} aria-hidden="true" /> <span>Reset</span>
      </button>
    </div>
  );
}
