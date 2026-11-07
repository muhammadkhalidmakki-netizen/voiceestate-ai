"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Undo2 } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import { portalContainer } from "../market-planning/shell/theme";
import v from "./v2.module.css";
import h from "./insights-home.module.css";

const ago = (at: number, now: number): string => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  return m === 1 ? "1 minute ago" : m < 60 ? `${m} minutes ago` : `${Math.round(m / 60)} h ago`;
};

/** Undo for the plan: the last three changes, newest first. Choosing one puts the plan back to how it was before that change. */
export default function HistoryMenu({ compact = false }: { compact?: boolean }) {
  const { history, restore } = usePlanner();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(0);
  const list = history ?? [];

  // "x minutes ago" is only worked out while the menu is open
  useEffect(() => {
    if (!open) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!restore) return null;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={compact ? h.undoCompact : v.pillBtn} aria-label={`Undo a change. ${list.length} ${list.length === 1 ? "step" : "steps"} available.`} title="Undo a change" disabled={list.length === 0}>
        <Undo2 size={16} aria-hidden="true" />
        <span className={compact ? h.undoText : v.btnText}>Undo</span>
        {list.length > 0 ? <span className={h.undoCount}>{list.length}</span> : null}
      </Popover.Trigger>
      <Popover.Portal container={portalContainer()}>
        <Popover.Content className={v.popover} align="end" sideOffset={10}>
          <p className={v.popTitle}>Go back to how it was before</p>
          <ul className={h.undoList}>
            {list.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={h.undoItem}
                  onClick={() => {
                    restore(e.id);
                    setOpen(false);
                  }}
                >
                  <Undo2 size={15} aria-hidden="true" />
                  <span className={h.undoLabel}>{e.label}</span>
                  <span className={h.undoWhen}>{ago(e.at, now || e.at)}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={v.emptyNote}>Your last three changes are kept, even after a refresh, while this browser tab stays open. Use Saved plans to keep a plan for longer.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
