"use client";

import { createContext, useContext, type Dispatch } from "react";
import type { Discovery, MarketCoverage } from "@/lib/market-planning/coverage";
import type {
  BudgetPreset,
  LeadPreset,
} from "@/lib/market-planning/model";
import type { Country, MarketResult, PlanResult, Range } from "@/lib/market-planning/types";
import type { Action, PlannerState } from "./planner-state";

export type MarketRow = MarketResult & { country: Country; coverage: MarketCoverage };

export type RegionRow = {
  region: string;
  share: number;
  spend: Range;
  leads: Range;
  /** True when some markets in the region have no CPL, so leads are partial. */
  partial: boolean;
  markets: MarketRow[];
};

export type Detail =
  | { kind: "country"; iso2: string }
  | { kind: "metric"; metric: "investment" | "leads" | "cpl" | "coverage" | "sales" }
  | { kind: "channel"; channel: "meta" | "google" }
  | null;

/** Cross-filter focus. It never changes the scenario, only what is highlighted. */
export type Focus = { kind: "region"; region: string } | { kind: "country"; iso2: string } | null;

export type PlannerView = {
  state: PlannerState;
  dispatch: Dispatch<Action>;
  plan: PlanResult;
  rows: MarketRow[];
  /** The close rate for the whole plan: each market's own rate, weighted by its leads. The base rate in state is only the anchor. */
  effectiveCloseRate: number;
  /** Whole-number budget percentages that always total 100. */
  pct: Record<string, number>;
  regions: RegionRow[];
  budgetPresets: BudgetPreset[] | null;
  leadPresets: LeadPreset[] | null;
  discovery: Discovery;
  customized: boolean;
  channel: { meta: Range; google: Range; metaShare: number; googleShare: number };
  detail: Detail;
  openDetail: (d: Exclude<Detail, null>) => void;
  closeDetail: () => void;
  focus: Focus;
  setFocus: (f: Focus) => void;
  /** The last few changes, newest first, and a way to go back to before one of them. */
  history?: Array<{ id: number; label: string; at: number }>;
  restore?: (id: number) => void;
};

const Ctx = createContext<PlannerView | null>(null);

export const PlannerProvider = Ctx.Provider;

export function usePlanner(): PlannerView {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlanner must be used inside PlannerProvider");
  return v;
}

/** Whether a country row is in the current cross-filter focus. */
export function inFocus(focus: Focus, row: { iso2: string; country: Country }): boolean {
  if (!focus) return true;
  return focus.kind === "region" ? row.country.region === focus.region : row.iso2 === focus.iso2;
}

export type { Discovery, MarketCoverage };
