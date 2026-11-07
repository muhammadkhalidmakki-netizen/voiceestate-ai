import type { PlannerState } from "../market-planning/planner-state";
import { COUNTRY_BY_ISO, LANGUAGE_OPTIONS } from "@/lib/market-planning/catalog";
import { sanitizePlan, type StoredPlan } from "@/lib/market-planning/plan-io";
import { MAX_CLOSE_RATE } from "@/lib/market-planning/sales";

const isCountry = (iso: string) => COUNTRY_BY_ISO.has(iso);
const isLang = (code: string) => LANGUAGE_OPTIONS.some((l) => l.code === code);

export const toStored = (s: PlannerState): StoredPlan => ({
  mode: s.mode,
  amountText: s.amountText,
  shares: s.shares,
  metaShare: s.metaShare,
  languages: s.languages,
  assumedCpl: s.assumedCpl,
  closeRate: s.closeRate,
  timingProvisional: s.timingProvisional,
  selection: s.selection,
  excluded: s.excluded,
});

/** Validated stored plan -> planner state, or null if it is not usable. */
export function stateFromUnknown(raw: unknown): PlannerState | null {
  const plan = sanitizePlan(raw, isCountry, isLang, MAX_CLOSE_RATE);
  // Plans saved before recommendation mode existed keep their explicit market list.
  return plan ? { ...plan, selection: plan.selection ?? "custom", excluded: plan.excluded ?? [] } : null;
}
