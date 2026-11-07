"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { COUNTRY_BY_ISO, LANGUAGE_SEEDS } from "@/lib/market-planning/catalog";
import { discoverMarkets, marketCoverage } from "@/lib/market-planning/coverage";
import { roundedPercents, splitChannels, sumRange } from "@/lib/market-planning/model";
import {
  PlannerProvider,
  type Detail,
  type Focus,
  type MarketRow,
  type PlannerView,
  type RegionRow,
} from "./planner-context";
import { initialState, isCustomized, planFor, reducer, uiLanguages } from "./planner-state";
import { blendedCloseRate } from "./planner-view";
import PlanningControls from "./builder/PlanningControls";
import MarketPicker from "./builder/MarketPicker";
import LanguagePicker from "./builder/LanguagePicker";
import AllocationControls from "./builder/AllocationControls";
import AcquisitionOutlook from "./forecast/AcquisitionOutlook";
import MarketTable from "./forecast/MarketTable";
import MaturityPanel from "./forecast/MaturityPanel";
import ChannelPanel from "./forecast/ChannelPanel";
import LanguageOpportunities from "./forecast/LanguageOpportunities";
import SalesTimeline from "./forecast/SalesTimeline";
import Explainer from "./forecast/Explainer";
import CoveragePanel from "./forecast/CoveragePanel";
import LiveBar from "./LiveBar";
import Hero from "./shell/Hero";
import Reveal from "./shell/Reveal";
import TopBar from "./shell/TopBar";
import DetailDrawer from "./DetailDrawer";
import s from "./market-planning.module.css";

export default function MarketPlanner() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [detail, setDetail] = useState<Detail>(null);
  const [focusRaw, setFocus] = useState<Focus>(null);
  const [builderOpen, setBuilderOpen] = useState(true);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  // The floating summary dock appears once the hero scrolls out of view.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const navigate = useCallback((id: string) => {
    const inBuilder = ["plan", "markets", "languages", "allocation"].includes(id);
    if (inBuilder) setBuilderOpen(true);
    // Wait a frame so a just-opened builder is laid out before scrolling.
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  }, []);

  const openDetail = useCallback((d: Exclude<Detail, null>) => setDetail(d), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  // Everything below is derived from `state`. Nothing is stored twice.
  const view = useMemo<PlannerView>(() => {
    const { result, budgetPresets, leadPresets } = planFor(state);

    const rows: MarketRow[] = result.markets.map((m) => ({
      ...m,
      country: COUNTRY_BY_ISO.get(m.iso2)!,
      coverage: marketCoverage(m.iso2, uiLanguages(state.languages), LANGUAGE_SEEDS),
    }));

    const effectiveCloseRate = blendedCloseRate(rows, state.closeRate, state.languages);

    const byRegion = new Map<string, MarketRow[]>();
    for (const r of rows) {
      const list = byRegion.get(r.country.region) ?? [];
      list.push(r);
      byRegion.set(r.country.region, list);
    }
    const regions: RegionRow[] = [...byRegion.entries()]
      .map(([region, markets]) => ({
        region,
        markets,
        share: markets.reduce((acc, m) => acc + m.share, 0),
        spend: sumRange(markets.map((m) => m.spend)),
        // Leads from markets that have a CPL; markets without one are left out, not zeroed.
        leads: markets.some((m) => m.cpl)
          ? sumRange(markets.filter((m) => m.cpl).map((m) => m.leads))
          : { lo: null, hi: null },
        partial: markets.some((m) => !m.cpl) && markets.some((m) => m.cpl),
      }))
      .sort((a, b) => b.share - a.share);

    const m = Math.min(1, Math.max(0, state.metaShare));
    const part = (v: number | null, k: number) => (v === null ? null : v * k);
    const channel = {
      meta: { lo: part(result.budget.lo, m), hi: part(result.budget.hi, m) },
      google: { lo: part(result.budget.lo, 1 - m), hi: part(result.budget.hi, 1 - m) },
      ...(() => {
        const sp = splitChannels(1, m);
        return { metaShare: sp.metaShare, googleShare: sp.googleShare };
      })(),
    };

    // Keep the cross-filter valid when markets are removed.
    const focus: Focus =
      focusRaw && (focusRaw.kind === "region"
        ? regions.some((r) => r.region === focusRaw.region)
        : rows.some((r) => r.iso2 === focusRaw.iso2))
        ? focusRaw
        : null;

    return {
      state,
      dispatch,
      plan: result,
      rows,
      effectiveCloseRate,
      pct: roundedPercents(state.shares),
      regions,
      budgetPresets,
      leadPresets,
      discovery: discoverMarkets(uiLanguages(state.languages), LANGUAGE_SEEDS),
      customized: isCustomized(state),
      channel,
      detail,
      openDetail,
      closeDetail,
      focus,
      setFocus,
    };
  }, [state, detail, focusRaw, openDetail, closeDetail]);

  return (
    <PlannerProvider value={view}>
      <main className={s.page}>
        <TopBar onNavigate={navigate} />

        <div ref={heroRef}>
          <Hero />
        </div>

        <LiveBar hidden={heroVisible} notify={() => {}} />

        <div className={s.workspace}>
          <aside className={s.builder} aria-label="Strategy builder">
            <button
              type="button"
              className={s.builderToggle}
              aria-expanded={builderOpen}
              aria-controls="builder-body"
              onClick={() => setBuilderOpen((o) => !o)}
            >
              <span>Strategy builder</span>
              <span className={s.builderToggleHint}>{builderOpen ? "Hide controls" : "Edit strategy"}</span>
            </button>
            <div id="builder-body" className={`${s.builderBody} ${builderOpen ? "" : s.builderClosed}`}>
              <PlanningControls />
              <hr className={s.rule} />
              <MarketPicker />
              <hr className={s.rule} />
              <LanguagePicker />
              <hr className={s.rule} />
              <AllocationControls />
            </div>
          </aside>

          <div className={s.forecast}>
            <Reveal className={s.span2}><AcquisitionOutlook /></Reveal>
            <Reveal className={s.span2}><MarketTable /></Reveal>
            <Reveal className={s.span2}><MaturityPanel /></Reveal>
            <Reveal className={s.span2}><ChannelPanel /></Reveal>
            <Reveal className={s.span2}><LanguageOpportunities /></Reveal>
            <Reveal className={s.span2}><CoveragePanel /></Reveal>
            <Reveal className={s.span2}><SalesTimeline /></Reveal>
            <Reveal className={s.span2}><Explainer /></Reveal>
          </div>
        </div>

        <DetailDrawer />
      </main>
    </PlannerProvider>
  );
}
