"use client";

import { Plus } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import { toStored } from "./plan-state-io";
import { setCurrentPlan, useCurrentPlan } from "./plan-current";
import h from "./insights-home.module.css";

/** Starts a fresh plan (the big round button in the phone dock). Asks first if there are unsaved changes. */
export default function NewPlanButton({ notify }: { notify: (m: string) => void }) {
  const { state, dispatch } = usePlanner();
  const current = useCurrentPlan();
  const dirty = current ? JSON.stringify(toStored(state)) !== current.snapshot : false;

  const start = () => {
    if (dirty && !window.confirm(`You have unsaved changes to “${current?.name}”. Start a new plan anyway? Undo can bring them back.`)) return;
    setCurrentPlan(null);
    dispatch({ type: "restore" });
    notify("Started a new plan");
  };

  return (
    <div className={h.dockNew}>
      <button type="button" className={h.dockPlus} onClick={start} aria-label="Start a new plan" title="Start a new plan">
        <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
