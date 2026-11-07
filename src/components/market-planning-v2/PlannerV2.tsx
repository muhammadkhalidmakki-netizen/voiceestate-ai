"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Languages, Scale, Table2 } from "lucide-react";
import { PlannerProvider, type Detail, type Focus, type PlannerView } from "../market-planning/planner-context";
import { initialState, reducer, type PlannerState } from "../market-planning/planner-state";
import { buildDerived } from "../market-planning/planner-view";
import DetailDrawer from "../market-planning/DetailDrawer";
import LiveBar from "../market-planning/LiveBar";
import Hero from "../market-planning/shell/Hero";
import TopBar, { type NavItem } from "../market-planning/shell/TopBar";
import { decodePlan } from "@/lib/market-planning/plan-io";
import { Actions, stateFromUnknown, toStored } from "./Header";
import { MarketBreakdownTab, MarketComparisonTab } from "./MarketInsightsTab";
import LanguageExplorerTab from "./LanguageExplorerTab";
import ExpertChat from "../market-planning/ExpertChat";
import { useUndo } from "../market-planning/undo-history";
import s from "../market-planning/market-planning.module.css";
import v from "./v2.module.css";

// The current plan is kept in this browser so a refresh or restart does not start from scratch.
const AUTOSAVE_KEY = "mp2_current_plan_v2";

const noopDispatch = () => {};

const TABS = [
  { id: "breakdown", label: "Market breakdown", Icon: Table2 },
  { id: "comparison", label: "Market comparison", Icon: Scale },
  { id: "language", label: "Language explorer", Icon: Languages },
] as const;

type TabId = (typeof TABS)[number]["id"];

// The pill navigation: the three workspace tabs.
const NAV: NavItem[] = [
  { id: "breakdown", label: "Breakdown", Icon: Table2 },
  { id: "comparison", label: "Comparison", Icon: Scale },
  { id: "language", label: "Languages", Icon: Languages },
];

export default function PlannerV2({ isAdmin = false, greetingName, shared }: { isAdmin?: boolean; greetingName?: string; /** A plan opened from a public link: view only. */ shared?: { name: string; state: PlannerState } } = {}) {
  const readOnly = !!shared;
  const [state, rawDispatch] = useReducer(reducer, shared?.state, (init: PlannerState | undefined) => init ?? initialState());
  const undo = useUndo(state, rawDispatch);
  const dispatch = readOnly ? noopDispatch : undo.dispatch;
  const { history: undoHistory, restore } = undo;
  const [detail, setDetail] = useState<Detail>(null);
  const [focusRaw, setFocus] = useState<Focus>(null);
  const [tab, setTab] = useState<TabId>("breakdown");
  const [toast, setToast] = useState<string | null>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [navActive, setNavActive] = useState<string>("breakdown");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // The floating summary dock appears once the hero scrolls out of view.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // On first load: a shared link wins; otherwise bring back the last plan from this browser.
  useEffect(() => {
    if (readOnly) return;
    const m = /^#plan=([A-Za-z0-9_-]+)$/.exec(window.location.hash);
    const timer = setTimeout(() => {
      if (m) {
        const next = stateFromUnknown(decodePlan(m[1]));
        if (next) {
          dispatch({ type: "load", state: next });
          notify("Shared plan loaded");
        } else {
          notify("That shared link could not be read");
        }
        history.replaceState(null, "", window.location.pathname);
      } else {
        try {
          const raw = localStorage.getItem(AUTOSAVE_KEY);
          const next = raw ? stateFromUnknown(JSON.parse(raw)) : null;
          if (next) dispatch({ type: "load", state: next });
        } catch {
          /* storage blocked or unreadable: just start from the recommended plan */
        }
      }
      restored.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, [notify, dispatch, readOnly]);

  // Save every change (after the first restore has run, so it never overwrites it with defaults).
  useEffect(() => {
    if (readOnly || !restored.current) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(toStored(state)));
    } catch {
      /* storage blocked: the planner still works, it just will not be remembered */
    }
  }, [state, readOnly]);

  const openDetail = useCallback((d: Exclude<Detail, null>) => setDetail(d), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const goTab = useCallback((id: TabId) => {
    setTab(id);
    setNavActive(id);
  }, []);

  const navigate = useCallback(
    (id: string) => {
      if (id === "breakdown" || id === "comparison" || id === "language") {
        goTab(id);
        document.getElementById("v2-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [goTab],
  );

  const chatContext = `My plan: AED ${state.amountText || "?"} a month, markets: ${Object.keys(state.shares).join(", ") || "none yet"}, languages: ${Object.keys(state.languages).join(", ")}.`;

  const view = useMemo<PlannerView>(() => {
    const derived = buildDerived(state);
    const focus: Focus =
      focusRaw &&
      (focusRaw.kind === "region"
        ? derived.regions.some((r) => r.region === focusRaw.region)
        : derived.rows.some((r) => r.iso2 === focusRaw.iso2))
        ? focusRaw
        : null;
    return { state, dispatch, ...derived, detail, openDetail, closeDetail, focus, setFocus, history: undoHistory, restore, readOnly };
  }, [state, dispatch, detail, focusRaw, openDetail, closeDetail, undoHistory, restore, readOnly]);

  return (
    <PlannerProvider value={view}>
      <div className={v.theme}>
        <main className={s.page}>
          <TopBar
            items={readOnly ? NAV.filter((n) => n.id !== "language") : NAV}
            activeId={navActive}
            onNavigate={navigate}
            hideAccount={readOnly}
            account={greetingName ? { name: greetingName, admin: isAdmin } : undefined}
            extraEnd={
              readOnly ? (
                <span className={v.sharedBadge} title="This is a shared plan. You can look around but not change it.">
                  Shared plan · view only{shared?.name ? ` · ${shared.name}` : ""}
                </span>
              ) : (
                <Actions notify={notify} />
              )
            }
          />

          <div ref={heroRef}>
            <Hero countUp salesTile />
          </div>

          {readOnly ? null : <LiveBar hidden={heroVisible} notify={notify} />}

          <div id="v2-workspace" className={v.workspace}>
            <div className={v.right}>
              <div className={v.tabs} role="tablist" aria-label="Workspace">
                {TABS.filter((t) => !(readOnly && t.id === "language")).map(({ id, label, Icon }) => {
                  const on = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`v2-tab-${id}`}
                      aria-selected={on}
                      aria-controls={`v2-panel-${id}`}
                      className={`${v.tab} ${on ? v.tabOn : ""}`}
                      onClick={() => goTab(id)}
                    >
                      {on ? <motion.span layoutId="v2-tab" className={v.tabPill} transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                      <span className={v.tabText}>
                        <Icon size={16} aria-hidden="true" />
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  role="tabpanel"
                  id={`v2-panel-${tab}`}
                  aria-labelledby={`v2-tab-${tab}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {tab === "breakdown" ? <MarketBreakdownTab /> : tab === "comparison" ? <MarketComparisonTab /> : <LanguageExplorerTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
        <DetailDrawer />
        <ExpertChat context={chatContext} />
        <AnimatePresence>
          {toast ? (
            <motion.div className={v.toast} role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </PlannerProvider>
  );
}
