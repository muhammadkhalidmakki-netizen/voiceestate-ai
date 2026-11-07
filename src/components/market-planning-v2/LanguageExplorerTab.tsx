"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { usePlanner } from "../market-planning/planner-context";
import Flag from "../market-planning/settings/Flag";
import { COUNTRIES, LANGUAGE_OPTIONS } from "@/lib/market-planning/catalog";
import { languageReach, type LanguageReach, type ReachLevel } from "@/lib/market-planning/intel/dashboard";
import v from "./v2.module.css";
import h from "./insights-home.module.css";

const LANGS = LANGUAGE_OPTIONS.filter((l) => l.code !== "other");
const REACHABLE: ReachLevel[] = ["strong", "partial", "limited"];
const isReachable = (r: LanguageReach) => REACHABLE.includes(r.level);
const LEVEL_TEXT: Record<ReachLevel, string> = { strong: "Strong", partial: "Partial", limited: "Limited", low: "Low", nodata: "No data" };

const fmtPeople = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} million` : n >= 1000 ? `${Math.round(n / 1000).toLocaleString("en-US")},000` : String(n));

/** Reach of every language in every country, worked out once. */
function useReachTable(): Record<string, Record<string, LanguageReach>> {
  return useMemo(() => {
    const out: Record<string, Record<string, LanguageReach>> = {};
    for (const l of LANGS) {
      const col: Record<string, LanguageReach> = {};
      for (const c of COUNTRIES) col[c.iso2] = languageReach(c.iso2, { [l.code]: "professional" });
      out[l.code] = col;
    }
    return out;
  }, []);
}

/* ------------------------------------------------------------------ Best languages for your markets */

function LanguagesForYourMarkets({ reach, onExplore }: { reach: Record<string, Record<string, LanguageReach>>; onExplore: (code: string) => void }) {
  const { state, rows, pct, dispatch } = usePlanner();
  const selectedLangs = Object.keys(state.languages);
  const englishOnly = selectedLangs.length === 1 && selectedLangs[0] === "en";

  const cards = useMemo(() => {
    const inPlan = new Set(rows.map((r) => r.iso2));
    return LANGS.map((l) => {
      const col = reach[l.code];
      const reached = rows.filter((r) => isReachable(col[r.iso2]));
      const budget = reached.reduce((s, r) => s + (pct[r.iso2] ?? 0), 0);
      const avgFactor = reached.length ? reached.reduce((s, r) => s + col[r.iso2].cplFactor * r.share, 0) / reached.reduce((s, r) => s + r.share, 0) : 1;
      const newMarkets = COUNTRIES.filter((c) => !inPlan.has(c.iso2) && ["strong", "partial"].includes(col[c.iso2].level)).length;
      return { ...l, reached: reached.length, budget, avgFactor, newMarkets, selected: selectedLangs.includes(l.code) };
    }).sort((a, b) => Number(b.selected) - Number(a.selected) || b.budget - a.budget || b.newMarkets - a.newMarkets);
  }, [reach, rows, pct, selectedLangs]);

  const suggestions = cards.filter((c) => !c.selected && c.newMarkets > 0).sort((a, b) => b.newMarkets - a.newMarkets).slice(0, 3);

  return (
    <section className={v.card} aria-labelledby="le-fit">
      <div className={v.cardHead}>
        <div>
          <h2 id="le-fit" className={v.cardTitle}>Languages for your markets</h2>
          <p className={v.cardSub}>How well each language reaches the {rows.length} {rows.length === 1 ? "market" : "markets"} in your plan, and what it could open up.</p>
        </div>
      </div>

      {englishOnly && suggestions.length > 0 ? (
        <div className={h.explore}>
          <b>You are only using English.</b>
          <span>
            Other languages can open more markets and sometimes lower the cost per lead:{" "}
            {suggestions.map((s, i) => (
              <button key={s.code} type="button" className={h.inlineLink} onClick={() => onExplore(s.code)}>
                {s.label} (+{s.newMarkets} markets){i < suggestions.length - 1 ? "," : ""}
              </button>
            ))}
          </span>
        </div>
      ) : null}

      <ul className={h.langCards}>
        {cards.map((c) => (
          <li key={c.code} className={`${h.langCard} ${c.selected ? h.langCardOn : ""}`}>
            <div className={h.langHead}>
              <b>{c.label}</b>
              {c.selected ? <span className={h.langBadge}><Check size={12} aria-hidden="true" /> In use</span> : null}
            </div>
            <div className={h.langBar} aria-hidden="true">
              <motion.span initial={{ width: 0 }} animate={{ width: `${Math.max(3, c.budget)}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <p className={h.langLine}>
              Reaches <b>{c.reached} of {rows.length}</b> of your markets (<b>{c.budget}%</b> of your budget)
            </p>
            <p className={h.langLine}>
              {c.reached === 0 ? "No cost per lead change: none of your markets" : Math.abs(c.avgFactor - 1) < 0.02 ? "Cost per lead stays at the benchmark" : `Cost per lead ${c.avgFactor > 1 ? "+" : "−"}${Math.round(Math.abs(c.avgFactor - 1) * 100)}% on average`}
            </p>
            <p className={h.langLine}>
              Opens <b>{c.newMarkets}</b> more {c.newMarkets === 1 ? "country" : "countries"}
            </p>
            <div className={h.langActions}>
              <button type="button" className={h.langBtn} onClick={() => onExplore(c.code)}>
                See countries
              </button>
              <button type="button" className={`${h.langBtn} ${c.selected ? h.langBtnOff : h.langBtnOn}`} onClick={() => dispatch({ type: "toggleLanguage", code: c.code })}>
                {c.selected ? (<><X size={12} aria-hidden="true" /> Remove</>) : (<><Plus size={12} aria-hidden="true" /> Use</>)}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ Where a language reaches */

function CountriesForLanguage({ reach, code, onCode }: { reach: Record<string, Record<string, LanguageReach>>; code: string; onCode: (c: string) => void }) {
  const { state, dispatch } = usePlanner();
  const [level, setLevel] = useState<"all" | "strong" | "partial" | "limited">("all");
  const [q, setQ] = useState("");
  const inPlan = new Set(Object.keys(state.shares));
  const label = LANGS.find((l) => l.code === code)?.label ?? code;
  const col = reach[code];

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = COUNTRIES.filter((c) => isReachable(col[c.iso2]) && (level === "all" || col[c.iso2].level === level) && (!needle || c.name.toLowerCase().includes(needle)));
    const byRegion = new Map<string, typeof COUNTRIES>();
    for (const c of list) byRegion.set(c.region, [...(byRegion.get(c.region) ?? []), c]);
    return [...byRegion.entries()]
      .map(([region, items]) => ({ region, items: items.sort((a, b) => col[b.iso2].score - col[a.iso2].score || a.name.localeCompare(b.name)) }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [col, level, q]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const counts = {
    strong: COUNTRIES.filter((c) => col[c.iso2].level === "strong").length,
    partial: COUNTRIES.filter((c) => col[c.iso2].level === "partial").length,
    limited: COUNTRIES.filter((c) => col[c.iso2].level === "limited").length,
  };

  return (
    <section className={v.card} aria-labelledby="le-where">
      <div className={v.cardHead}>
        <div>
          <h2 id="le-where" className={v.cardTitle}>Where {label} reaches</h2>
          <p className={v.cardSub}>Every country where {label} reaches a real audience, by region. Add one to your plan with +.</p>
        </div>
      </div>

      <div className={h.langTabs} role="group" aria-label="Choose a language">
        {LANGS.map((l) => (
          <button key={l.code} type="button" className={`${h.langTab} ${code === l.code ? h.langTabOn : ""}`} aria-pressed={code === l.code} onClick={() => onCode(l.code)}>
            {l.label}
            {state.languages[l.code] ? <span className={h.tabDot} aria-label="In use" /> : null}
          </button>
        ))}
      </div>

      <div className={h.tools}>
        <label className={h.search}>
          <Search size={15} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find a country for ${label}`} aria-label="Find a country" />
          {q ? (
            <button type="button" className={h.clear} aria-label="Clear search" onClick={() => setQ("")}>
              <X size={13} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className={h.reachSeg} role="group" aria-label="Filter by language reach">
          {([
            ["all", "All", counts.strong + counts.partial + counts.limited, "Every country where this language reaches an audience", ""],
            ["strong", "Strong", counts.strong, "The language is widely spoken here", "#12b76a"],
            ["partial", "Partial", counts.partial, "A large community speaks it here", "#3b7bff"],
            ["limited", "Limited", counts.limited, "A small but real community speaks it here", "#f59a23"],
          ] as const).map(([id, text, n, hint, color]) => (
            <button key={id} type="button" className={`${h.segOpt} ${level === id ? h.segOptOn : ""}`} style={{ ["--sc" as string]: color || "var(--mp-navy)" }} aria-pressed={level === id} title={hint} onClick={() => setLevel(id)}>
              {color ? <span className={h.segDot} aria-hidden="true" /> : null}
              <span>{text}</span>
              <b>{n}</b>
            </button>
          ))}
        </div>
      </div>

      <p className={h.reachHelp}><b>Strong</b> = widely spoken. <b>Partial</b> = a large community (roughly a quarter of a million people or more). <b>Limited</b> = a small but real community.</p>

      {total === 0 ? (
        <p className={h.empty}>No country matches. {counts.strong + counts.partial + counts.limited === 0 ? `We hold no country data for ${label} yet.` : ""}</p>
      ) : (
        <div className={h.regionGroups}>
          {groups.map((g) => (
            <div key={g.region} className={h.regionBlock}>
              <div className={h.regionTitle}>
                <b>{g.region}</b>
                <span>{g.items.length} {g.items.length === 1 ? "country" : "countries"}</span>
              </div>
              <ul className={h.countryGrid}>
                {g.items.map((c) => {
                  const r = col[c.iso2];
                  const on = inPlan.has(c.iso2);
                  return (
                    <li key={c.iso2}>
                      <button type="button" className={`${h.countryBtn} ${on ? h.countryOn : ""}`} aria-pressed={on} onClick={() => dispatch({ type: "toggleMarket", iso2: c.iso2 })} title={`${label} reaches about ${r.speakers === null ? "an unknown number of" : fmtPeople(r.speakers)} people in ${c.name}. ${on ? "In your plan: click to remove." : "Click to add to your plan."}`}>
                        <Flag iso2={c.iso2} name={c.name} size={20} />
                        <span className={h.countryName}>{c.name}</span>
                        <span className={`${h.reachTag} ${h[`reach_${r.level}`]}`}>{LEVEL_TEXT[r.level]}</span>
                        <span className={h.countryAdd} aria-hidden="true">{on ? <Check size={13} /> : <Plus size={13} />}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p className={h.note}>Reach is how well {label} reaches the country, from speaker numbers and diaspora communities. Low-confidence figures are estimates; see Data &amp; assumptions for sources.</p>
    </section>
  );
}

export default function LanguageExplorerTab() {
  const { state } = usePlanner();
  const reach = useReachTable();
  const first = Object.keys(state.languages)[0] ?? "en";
  const [code, setCode] = useState<string>(first);
  return (
    <div className={v.stack}>
      <LanguagesForYourMarkets reach={reach} onExplore={(c) => { setCode(c); document.getElementById("le-where")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
      <CountriesForLanguage reach={reach} code={code} onCode={setCode} />
    </div>
  );
}
