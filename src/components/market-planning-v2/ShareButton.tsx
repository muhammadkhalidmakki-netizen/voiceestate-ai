"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Copy, Globe, Lock, Share2 } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import { portalContainer } from "../market-planning/shell/theme";
import { toStored } from "./plan-state-io";
import { useCurrentPlan } from "./plan-current";
import { PlansError, listPlans, setShare, type PlanMeta } from "@/lib/market-planning/plans-client";
import v from "./v2.module.css";
import h from "./insights-home.module.css";

/** Share button for the plan being edited. Disabled until a saved plan is open. Opens a small card with Private / Public and the link. */
export default function ShareButton({ notify, compact = false }: { notify: (m: string) => void; compact?: boolean }) {
  const { state } = usePlanner();
  const current = useCurrentPlan();
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<PlanMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dirty = current ? JSON.stringify(toStored(state)) !== current.snapshot : false;
  const currentId = current?.id;

  useEffect(() => {
    if (!open || !currentId) return;
    let live = true;
    const t = setTimeout(() => live && setError(null), 0);
    listPlans()
      .then((r) => live && setMeta(r.plans.find((p) => p.id === currentId) ?? null))
      .catch((e) => live && setError(e instanceof PlansError ? e.message : "Could not load this plan."));
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, currentId]);

  const link = meta?.shareToken && typeof window !== "undefined" ? `${window.location.origin}/dubai/share/${meta.shareToken}` : "";

  const toggle = async (on: boolean) => {
    if (!current) return;
    if (!on && !window.confirm(`Make “${current.name}” private? The shared link stops working for everyone who has it.`)) return;
    setBusy(true);
    setError(null);
    try {
      const tok = await setShare(current.id, on);
      setMeta((m) => (m ? { ...m, shareToken: tok ?? undefined } : m));
      notify(on ? `“${current.name}” is public: anyone with the link can view it` : `“${current.name}” is private again`);
    } catch (e) {
      setError(e instanceof PlansError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const disabled = !current;
  const isPublic = !!meta?.shareToken;

  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Trigger
        className={`${compact ? `${h.rowIcon} ${h.dockBtn}` : v.pillBtn} ${isPublic ? h.shareIconOn : ""} ${disabled ? h.shareDisabled : ""}`}
        disabled={disabled}
        aria-label={disabled ? "Share: open or save a plan first" : `Share ${current?.name}`}
        title={disabled ? "Open or save a plan to share it" : "Share this plan"}
        style={compact ? { width: 34, height: 34, background: "var(--mp-tint)" } : undefined}
      >
        <Share2 size={16} aria-hidden="true" />
        <span className={h.dockLabel}>Share</span>
      </Popover.Trigger>
      <Popover.Portal container={portalContainer()}>
        <Popover.Content className={h.sharePop} align="end" sideOffset={10} collisionPadding={12}>
          <div className={h.shareHead}>
            <span className={h.shareTitle}>
              {isPublic ? <Globe size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
              {isPublic ? "Anyone with the link" : "Only you"}
            </span>
            <div className={h.shareSeg} role="group" aria-label="Who can view this plan">
              <button type="button" className={!isPublic ? h.shareOn : ""} aria-pressed={!isPublic} onClick={() => isPublic && void toggle(false)} disabled={busy || !meta}>
                Private
              </button>
              <button type="button" className={isPublic ? h.shareOn : ""} aria-pressed={isPublic} onClick={() => !isPublic && void toggle(true)} disabled={busy || !meta || dirty}>
                Public
              </button>
            </div>
          </div>
          {isPublic ? (
            <>
              <div className={h.shareLink}>
                <input readOnly value={link} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} />
                <button type="button" onClick={() => void copy()}>
                  {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className={h.shareHint}>View only, no sign-in needed. Shows the latest saved version{dirty ? " (you have unsaved changes that are not shown)" : ""}.</p>
            </>
          ) : (
            <p className={h.shareHint}>{dirty ? "Save your changes first, then you can make this plan public." : "Make it public to get a link anyone can view without signing in."}</p>
          )}
          {error ? <p className={h.planError} role="alert">{error}</p> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
