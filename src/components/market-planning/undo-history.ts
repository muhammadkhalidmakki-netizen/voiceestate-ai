"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import { reducer, type Action, type PlannerState } from "./planner-state";
import { COUNTRY_BY_ISO, LANGUAGE_OPTIONS } from "@/lib/market-planning/catalog";

export type HistoryEntry = { id: number; label: string; at: number };
type Stored = HistoryEntry & { state: PlannerState; kind: string };

const KEEP = 3; // how many steps back a person can go
const STORE_KEY = "mp2_undo_v1"; // kept in this browser tab, so a refresh does not lose the steps
const MERGE_MS = 1500; // typing a budget or dragging a slider is one change, not fifty

const country = (iso2: string) => COUNTRY_BY_ISO.get(iso2)?.name ?? iso2;
const language = (code: string) => LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? code;

/** The kind of change, used to merge rapid repeats of the same change into one step. */
function kindOf(a: Action): string {
  switch (a.type) {
    case "setAmountText":
    case "setAmount":
      return "budget";
    case "setShare":
    case "equalizeShares":
      return "split";
    case "setCloseRate":
      return "close";
    case "setMeta":
      return "channels";
    default:
      return a.type;
  }
}

/** A short human label for the change, from the state before and after it. */
function describe(a: Action, before: PlannerState, after: PlannerState, base: PlannerState): string {
  switch (a.type) {
    case "setAmountText":
    case "setAmount":
      return `Budget ${base.amountText || "(empty)"} → ${after.amountText || "(empty)"}`;
    case "setMode":
      return a.mode === "budget" ? "Switched to a monthly budget" : "Switched to a lead target";
    case "toggleMarket":
      return a.iso2 in before.shares ? `Removed ${country(a.iso2)}` : `Added ${country(a.iso2)}`;
    case "addMarkets":
      return `Added ${a.iso2s.length} ${a.iso2s.length === 1 ? "market" : "markets"}`;
    case "removeMarkets":
      return `Removed ${a.iso2s.length} ${a.iso2s.length === 1 ? "market" : "markets"}`;
    case "setShare":
    case "equalizeShares":
      return "Changed the budget split";
    case "setMeta":
      return "Changed the channel split";
    case "toggleLanguage":
      return a.code in before.languages ? `Removed ${language(a.code)}` : `Added ${language(a.code)}`;
    case "setProficiency":
      return `${language(a.code)}: level changed`;
    case "setAssumedCpl":
      return `Changed the cost per lead for ${country(a.iso2)}`;
    case "setCloseRate":
      return "Changed the close rate";
    case "setTimingProvisional":
      return "Changed the timing setting";
    case "resetMarkets":
      return "Reset the markets";
    case "restore":
      return "Reset the whole plan";
    case "load":
      return "Loaded a plan";
    default:
      return "Changed your plan";
  }
}

/**
 * Keeps the last few states (and keeps them across a refresh of this tab) so a mistake is one click from undone. Every change goes through the returned
 * dispatch; going back puts the earlier state back and keeps a "Redo" step so the undo itself can be undone.
 */
export function useUndo(state: PlannerState, raw: Dispatch<Action>) {
  const latest = useRef(state);
  const store = useRef<Stored[]>([]);
  const seq = useRef(1);
  const startedAt = useRef(0);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  // Start-up: remember when the page opened, and bring back the steps from before a refresh (same tab only).
  useEffect(() => {
    startedAt.current = Date.now();
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      const saved = raw ? (JSON.parse(raw) as Stored[]) : [];
      if (Array.isArray(saved) && saved.length) {
        store.current = saved.filter((e) => e && typeof e.id === "number" && e.state).slice(0, KEEP);
        seq.current = Math.max(1, ...store.current.map((e) => e.id + 1));
        setEntries(store.current.map(({ id, label, at }) => ({ id, label, at })));
      }
    } catch {
      /* storage blocked or unreadable: undo still works until the page is refreshed */
    }
  }, []);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const publish = () => {
    setEntries(store.current.map(({ id, label, at }) => ({ id, label, at })));
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(store.current));
    } catch {
      /* storage blocked: the steps are simply not kept across a refresh */
    }
  };

  const dispatch = useCallback(
    (action: Action) => {
      const before = latest.current;
      const after = reducer(before, action);
      latest.current = after;
      // The plan coming back from this browser when the page opens is not a change the person made.
      const startup = action.type === "load" && Date.now() - startedAt.current < 2500;
      if (after !== before && !startup) {
        const kind = kindOf(action);
        const now = Date.now();
        const top = store.current[0];
        if (top && top.kind === kind && now - top.at < MERGE_MS) {
          top.at = now;
          top.label = describe(action, before, after, top.state);
        } else {
          store.current = [{ id: seq.current++, at: now, kind, label: describe(action, before, after, before), state: before }, ...store.current].slice(0, KEEP);
        }
        publish();
      }
      raw(action);
    },
    [raw],
  );

  const restore = useCallback(
    (id: number) => {
      const i = store.current.findIndex((e) => e.id === id);
      if (i < 0) return;
      const target = store.current[i];
      const current = latest.current;
      const older = store.current.slice(i + 1);
      store.current = [{ id: seq.current++, at: Date.now(), kind: "undo", label: `Redo: ${target.label}`, state: current }, ...older].slice(0, KEEP);
      latest.current = target.state;
      raw({ type: "load", state: target.state });
      publish();
    },
    [raw],
  );

  return { dispatch, history: entries, restore };
}
