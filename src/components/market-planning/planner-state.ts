// Shared planner state. One reducer holds every input, and every output on the
// page is derived from it (see MarketPlanner). Nothing is stored twice.

import {
  COUNTRY_BY_ISO,
  LEARNING_CPL,
  clientCpl,
} from "@/lib/market-planning/catalog";
import {
  addMarketShare,
  budgetPresets,
  computePlan,
  equalShares,
  leadPresets,
  removeMarketShare,
  setMarketShare,
  syncedAmount,
  validateAmount,
} from "@/lib/market-planning/model";
import type { MarketInput, PlanMode, Proficiency } from "@/lib/market-planning/types";
import { dashboardModelledCpl, languageCplFactorFor, recommendForDashboard } from "@/lib/market-planning/intel/dashboard";
import { parseAmount } from "@/lib/market-planning/format";
import { DEFAULT_CLOSE_RATE, MAX_CLOSE_RATE } from "@/lib/market-planning/sales";

/** English is selected by default and always counts as the baseline agent language. */
export const DEFAULT_LANGUAGES: Record<string, Proficiency> = { en: "professional" };

const isDefaultLanguages = (l: Record<string, Proficiency>) => Object.keys(l).length === 1 && l.en === "professional";

/**
 * The languages the language-specific views (coverage badges, language opportunities) should react to.
 * English alone is the baseline and shows nothing extra, as before; any other choice shows through.
 */
export function uiLanguages(l: Record<string, Proficiency>): Record<string, Proficiency> {
  return isDefaultLanguages(l) || Object.keys(l).length === 0 ? {} : l;
}

export type PlannerState = {
  mode: PlanMode;
  /** Raw text of the amount field so typing feels natural. */
  amountText: string;
  /** Budget share by selected country (sums to 1). */
  shares: Record<string, number>;
  /** Meta share of the budget, 0..1. Google is the remainder. */
  metaShare: number;
  languages: Record<string, Proficiency>;
  /** Editable planning CPL for markets without a client benchmark. */
  assumedCpl: Record<string, number>;
  /** Illustrative raw-lead-to-sale rate (0..1). A provisional planning assumption, not a client benchmark. */
  closeRate: number;
  /** Whether the 19-case timing checkpoints are applied as a provisional monthly distribution. */
  timingProvisional: boolean;
  /**
   * "recommended": the market list is recalculated whenever budget, lead target, languages or planning CPLs change.
   * "custom": the user took control; explicit selections are preserved until Reset to recommendations.
   */
  selection: "recommended" | "custom";
  /** Markets the user removed; they are never recommended until reset. */
  excluded: string[];
};

export type Action =
  | { type: "setMode"; mode: PlanMode }
  | { type: "setAmountText"; text: string }
  | { type: "setAmount"; value: number }
  | { type: "toggleMarket"; iso2: string }
  | { type: "addMarkets"; iso2s: string[] }
  | { type: "removeMarkets"; iso2s: string[] }
  | { type: "setShare"; iso2: string; share: number }
  | { type: "equalizeShares" }
  | { type: "setMeta"; share: number }
  | { type: "toggleLanguage"; code: string }
  | { type: "setProficiency"; code: string; level: Proficiency }
  | { type: "setAssumedCpl"; iso2: string; value: number | null }
  | { type: "setCloseRate"; rate: number }
  | { type: "setTimingProvisional"; on: boolean }
  | { type: "load"; state: PlannerState }
  | { type: "resetMarkets" }
  | { type: "restore" };

/**
 * Order of precedence: client benchmark, then the user's own planning CPL, then a modelled estimate
 * (only while DASHBOARD_USES_MODELLED_CPL is on). `fallbackCpl` can replace the modelled source.
 */
export function marketInputs(
  state: PlannerState,
  fallbackCpl?: (iso2: string) => MarketInput["cpl"],
): MarketInput[] {
  return Object.keys(state.shares).map((iso2) => {
    const country = COUNTRY_BY_ISO.get(iso2);
    const benchmark = country ? clientCpl(country) : null;
    const assumed = state.assumedCpl[iso2];
    const cpl =
      benchmark ??
      (assumed
        ? { lo: assumed, hi: assumed, relation: "point" as const, source: "planning-assumption" as const }
        : ((fallbackCpl ?? dashboardModelledCpl)(iso2) ?? null));
    // A benchmark or estimate is an English-campaign figure: scale it for the agent languages. A figure you typed is exact.
    if (cpl && cpl.source !== "planning-assumption") {
      const f = languageCplFactorFor(iso2, state.languages);
      if (f !== 1) return { iso2, share: state.shares[iso2], cpl: { ...cpl, lo: cpl.lo === null ? null : cpl.lo * f, hi: cpl.hi * f, languageFactor: f } };
    }
    return { iso2, share: state.shares[iso2], cpl };
  });
}

export function planFor(state: PlannerState) {
  const markets = marketInputs(state);
  return {
    markets,
    result: computePlan({
      mode: state.mode,
      amount: parseAmount(state.amountText),
      markets,
      learning: LEARNING_CPL,
    }),
    budgetPresets: budgetPresets(markets),
    leadPresets: leadPresets(markets),
  };
}

/**
 * Recalculates the recommended market list from the current inputs. Does nothing in "custom" mode or
 * while the amount is not yet valid (for example half-typed), so the list never flickers or empties.
 */
function recompute(state: PlannerState): PlannerState {
  if (state.selection !== "recommended") return state;
  const amount = parseAmount(state.amountText);
  if (amount === null || !validateAmount(state.mode, amount).ok) return state;
  const rec = recommendForDashboard({
    mode: state.mode,
    amount,
    languages: state.languages,
    closeRate: state.closeRate,
    exclude: state.excluded,
    cplOverrides: state.assumedCpl,
  });
  if (rec.markets.length === 0) return state;
  return { ...state, shares: Object.fromEntries(rec.markets.map((m) => [m.iso2, m.share])) };
}

export function initialState(): PlannerState {
  const base: PlannerState = {
    mode: "budget",
    amountText: "10000",
    shares: {},
    metaShare: 0.5,
    languages: { ...DEFAULT_LANGUAGES },
    assumedCpl: {},
    closeRate: DEFAULT_CLOSE_RATE,
    timingProvisional: true,
    selection: "recommended",
    excluded: [],
  };
  return recompute(base);
}

function addAll(shares: Record<string, number>, iso2s: string[]) {
  return iso2s.reduce((acc, iso) => addMarketShare(acc, iso), shares);
}

const withExcluded = (excluded: string[], add: string[], remove: string[]) =>
  [...new Set([...excluded, ...add])].filter((k) => !remove.includes(k));

export function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case "setMode": {
      if (action.mode === state.mode) return state;
      // Keep both modes in sync: carry the derived value into the other mode.
      const { result } = planFor(state);
      const carried = syncedAmount(result, action.mode);
      return recompute({
        ...state,
        mode: action.mode,
        amountText: carried === null ? state.amountText : String(carried),
      });
    }
    case "setAmountText":
      return recompute({ ...state, amountText: action.text });
    case "setAmount":
      return recompute({ ...state, amountText: String(action.value) });
    case "toggleMarket": {
      const selected = action.iso2 in state.shares;
      if (selected && Object.keys(state.shares).length === 1) return state; // keep at least one market
      // Any manual change to the list hands control to the user.
      return {
        ...state,
        selection: "custom",
        excluded: selected ? withExcluded(state.excluded, [action.iso2], []) : withExcluded(state.excluded, [], [action.iso2]),
        shares: selected ? removeMarketShare(state.shares, action.iso2) : addMarketShare(state.shares, action.iso2),
      };
    }
    case "addMarkets":
      return {
        ...state,
        selection: "custom",
        excluded: withExcluded(state.excluded, [], action.iso2s),
        shares: addAll(state.shares, action.iso2s),
      };
    case "removeMarkets": {
      let shares = state.shares;
      const removed: string[] = [];
      for (const iso of action.iso2s) {
        if (Object.keys(shares).length <= 1) break;
        shares = removeMarketShare(shares, iso);
        removed.push(iso);
      }
      return { ...state, selection: "custom", excluded: withExcluded(state.excluded, removed, []), shares };
    }
    case "setShare":
      return { ...state, selection: "custom", shares: setMarketShare(state.shares, action.iso2, action.share) };
    case "equalizeShares":
      return { ...state, selection: "custom", shares: equalShares(Object.keys(state.shares)) };
    case "setMeta":
      return { ...state, metaShare: Math.min(1, Math.max(0, action.share)) };
    case "toggleLanguage": {
      const languages = { ...state.languages };
      if (languages[action.code]) delete languages[action.code];
      else languages[action.code] = "professional";
      // At least one language is always selected: removing the last one puts the English default back.
      return recompute({ ...state, languages: Object.keys(languages).length ? languages : { ...DEFAULT_LANGUAGES } });
    }
    case "setProficiency":
      return recompute({ ...state, languages: { ...state.languages, [action.code]: action.level } });
    case "setAssumedCpl": {
      const assumedCpl = { ...state.assumedCpl };
      if (action.value === null || !(action.value > 0)) delete assumedCpl[action.iso2];
      else assumedCpl[action.iso2] = action.value;
      return recompute({ ...state, assumedCpl });
    }
    case "setCloseRate":
      return { ...state, closeRate: Math.min(MAX_CLOSE_RATE, Math.max(0, action.rate)) };
    case "setTimingProvisional":
      return { ...state, timingProvisional: action.on };
    case "load":
      // Plans saved before English was shown as selected have no language: they mean English.
      return Object.keys(action.state.languages).length ? action.state : { ...action.state, languages: { ...DEFAULT_LANGUAGES } };
    case "resetMarkets":
      // Reset to recommendations: hand the market list back to the algorithm.
      return recompute({ ...state, selection: "recommended", excluded: [], assumedCpl: {} });
    case "restore":
      // Back to the recommended starting plan, including the default agent language (English).
      return recompute({ ...initialState(), shares: {} });
  }
}

/** True when anything differs from the recommended starting plan, including a non-default agent language. */
export function isCustomized(state: PlannerState): boolean {
  const base = recompute({ ...initialState(), shares: {} });
  const same = (a: Record<string, number>, b: Record<string, number>) => {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => k in b && Math.abs(a[k] - b[k]) < 1e-6);
  };
  return !(
    state.selection === "recommended" &&
    isDefaultLanguages(state.languages) && // English only is the default
    state.mode === base.mode &&
    state.amountText === base.amountText &&
    same(state.shares, base.shares) &&
    state.metaShare === base.metaShare &&
    state.closeRate === base.closeRate &&
    state.timingProvisional === base.timingProvisional &&
    Object.keys(state.assumedCpl).length === 0
  );
}
