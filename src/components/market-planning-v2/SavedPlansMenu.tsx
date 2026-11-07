"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { BookmarkPlus, ChevronDown, CloudUpload, FilePlus2, Save, Trash2 } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import { portalContainer } from "../market-planning/shell/theme";
import { stateFromUnknown, toStored } from "./plan-state-io";
import { PlansError, createPlan, deletePlan, getPlan, listPlans, updatePlan, type PlanMeta } from "@/lib/market-planning/plans-client";
import { setCurrentPlan, useCurrentPlan, type CurrentPlan } from "./plan-current";
import v from "./v2.module.css";
import h from "./insights-home.module.css";

const LEGACY_KEY = "mp2_saved_plans_v1";
type Legacy = { id: string; name: string; savedAt: string; plan: unknown };

const snap = (s: Parameters<typeof toStored>[0]) => JSON.stringify(toStored(s));
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function readLegacy(): Legacy[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Legacy[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saved plans, kept on the server so they survive a new browser, another computer or cleared data. Shows which plan you are
 * editing (and whether you have unsaved changes), saves back to it, saves a copy, and starts a fresh plan.
 */
export default function SavedPlansMenu({ notify, compact = false }: { notify: (m: string) => void; compact?: boolean }) {
  const { state, dispatch } = usePlanner();
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<PlanMeta[] | null>(null);
  const [storage, setStorage] = useState<"cloudflare" | "local">("cloudflare");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const current: CurrentPlan | null = useCurrentPlan();

  const [legacy, setLegacy] = useState<Legacy[]>([]);
  const awaiting = useRef<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLegacy(readLegacy()), 0);
    return () => clearTimeout(t);
  }, []);

  // After loading a plan, the snapshot is taken from the state that actually results, so a plan never shows as edited just because it was opened.
  useEffect(() => {
    const a = awaiting.current;
    if (!a) return;
    awaiting.current = null;
    const t = setTimeout(() => setCurrentPlan({ id: a.id, name: a.name, snapshot: snap(state) }), 0);
    return () => clearTimeout(t);
  }, [state]);

  const dirty = current ? snap(state) !== current.snapshot : false;

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const r = await listPlans();
      setPlans(r.plans);
      setStorage(r.storage);
    } catch (e) {
      setPlans([]);
      setError(e instanceof PlansError ? e.message : "Could not load your plans.");
    }
  }, []);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [open, refresh]);

  const fail = (e: unknown) => {
    setError(e instanceof PlansError ? e.message : "Something went wrong. Please try again.");
    notify("Could not save. See the plans menu.");
  };

  const saveNew = async (label: string) => {
    setBusy(true);
    setError(null);
    try {
      const made = await createPlan(label, toStored(state));
      setCurrentPlan({ id: made.id, name: made.name, snapshot: snap(state) });
      setName("");
      notify(`Saved “${made.name}”`);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      await updatePlan(current.id, { plan: toStored(state) });
      setCurrentPlan({ ...current, snapshot: snap(state) });
      notify(`Saved changes to “${current.name}”`);
      await refresh();
    } catch (e) {
      if (e instanceof PlansError && e.status === 404) {
        setCurrentPlan(null);
        setError("This plan was deleted somewhere else. Save it again as a new plan.");
      } else fail(e);
    } finally {
      setBusy(false);
    }
  };

  const openPlan = async (id: string) => {
    if (dirty && !window.confirm(`You have unsaved changes to “${current?.name}”. Open another plan anyway? Undo can bring them back.`)) return;
    setBusy(true);
    setError(null);
    try {
      const rec = await getPlan(id);
      const next = stateFromUnknown(rec.plan);
      if (!next) throw new PlansError("That saved plan could not be read.", 422);
      awaiting.current = { id: rec.id, name: rec.name };
      dispatch({ type: "load", state: next });
      notify(`Opened “${rec.name}”`);
      setOpen(false);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const startNew = () => {
    if (dirty && !window.confirm(`You have unsaved changes to “${current?.name}”. Start a new plan anyway? Undo can bring them back.`)) return;
    setCurrentPlan(null);
    dispatch({ type: "restore" });
    notify("Started a new plan");
    setOpen(false);
  };

  const remove = async (p: PlanMeta) => {
    if (!window.confirm(`Delete “${p.name}” for everyone? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deletePlan(p.id);
      if (current?.id === p.id) setCurrentPlan(null);
      notify(`Deleted “${p.name}”`);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const moveLegacy = async () => {
    setBusy(true);
    setError(null);
    let moved = 0;
    try {
      for (const l of legacy) {
        await createPlan(l.name || "Saved plan", l.plan);
        moved++;
      }
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
      setLegacy([]);
      notify(`Moved ${moved} ${moved === 1 ? "plan" : "plans"} to the server`);
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const label = current ? current.name : "Saved plans";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={`${compact ? h.planCompact : v.pillBtn} ${current ? h.planActive : ""}`} aria-label={current ? `Editing plan ${current.name}${dirty ? ", unsaved changes" : ""}. Open saved plans.` : "Saved plans"}>
        <BookmarkPlus size={16} aria-hidden="true" />
        <span className={`${compact ? "" : v.btnText} ${h.planName}`}>{label}</span>
        {current && dirty ? <span className={h.dirtyDot} title="Unsaved changes" /> : null}
        <ChevronDown size={16} aria-hidden="true" className={v.btnText} />
      </Popover.Trigger>
      <Popover.Portal container={portalContainer()}>
        <Popover.Content className={`${v.popover} ${h.plansPop}`} align="end" sideOffset={10}>
          <div className={h.menuHead}>
            <div className={h.menuTitle}>
              {current ? (
                <>
                  <b>{current.name}</b>
                  <span className={dirty ? h.stateDirty : h.stateSaved}>{dirty ? "● Unsaved changes" : "✓ Saved"}</span>
                </>
              ) : (
                <b>Save this plan</b>
              )}
            </div>
            <button type="button" className={h.newBtn} onClick={startNew} disabled={busy}>
              <FilePlus2 size={14} aria-hidden="true" /> New plan
            </button>
          </div>
          {current ? (
            <div className={h.saveBtns}>
              <button type="button" className={`${v.pillBtn} ${v.pillBtnPrimary}`} onClick={saveChanges} disabled={busy || !dirty}>
                <Save size={14} aria-hidden="true" /> Save
              </button>
              <button type="button" className={v.pillBtn} onClick={() => void saveNew(`${current.name} copy`)} disabled={busy}>
                Save as copy
              </button>
            </div>
          ) : (
            <div className={v.saveRow}>
              <input className={v.nameInput} placeholder={`Plan ${(plans?.length ?? 0) + 1}`} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void saveNew(name.trim() || `Plan ${(plans?.length ?? 0) + 1}`)} aria-label="Plan name" />
              <button type="button" className={`${v.pillBtn} ${v.pillBtnPrimary}`} onClick={() => void saveNew(name.trim() || `Plan ${(plans?.length ?? 0) + 1}`)} disabled={busy}>
                Save
              </button>
            </div>
          )}

          {legacy.length > 0 ? (
            <button type="button" className={h.legacyBtn} onClick={() => void moveLegacy()} disabled={busy}>
              <CloudUpload size={15} aria-hidden="true" />
              <span>
                Move {legacy.length} {legacy.length === 1 ? "plan" : "plans"} saved in this browser to the server
              </span>
            </button>
          ) : null}

          {error ? (
            <p className={h.planError} role="alert">
              {error}{" "}
              <button type="button" className={h.inlineLink} onClick={() => void refresh()}>
                Try again
              </button>
            </p>
          ) : null}

          {plans === null ? (
            <p className={v.emptyNote}>Loading your plans…</p>
          ) : plans.length === 0 && !error ? (
            <p className={v.emptyNote}>No saved plans yet. Plans are saved on the server, so you and your team can open them from any computer.</p>
          ) : (
            <ul className={v.savedList}>
              {plans.map((p) => (
                <li key={p.id} className={`${v.savedItem} ${current?.id === p.id ? h.savedCurrent : ""}`}>
                  <button type="button" className={v.savedLoad} onClick={() => void openPlan(p.id)} disabled={busy}>
                    <span className={v.savedName}>
                      {p.name}
                      {current?.id === p.id ? <span className={h.editingBadge}>Editing</span> : null}
                    </span>
                    <span className={v.savedMeta}>{when(p.updatedAt)}</span>
                  </button>
                  <button type="button" className={v.smallIcon} aria-label={`Delete ${p.name}`} onClick={() => void remove(p)} disabled={busy}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className={v.emptyNote}>{storage === "local" ? "Development mode: plans are saved on this computer only." : "Saved on the server and shared with everyone who signs in."}</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
