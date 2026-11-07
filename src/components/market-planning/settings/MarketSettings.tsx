"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { usePlanner } from "../planner-context";
import SettingsDialog from "./SettingsDialog";
import Flag from "./Flag";
import OpportunityTip from "./OpportunityTip";
import {
  COUNTRIES,
  LANGUAGE_OPTIONS,
  REGIONS,
  clientCpl,
  marketClassLabel,
  planningCpl,
} from "@/lib/market-planning/catalog";
import { fmtCpl } from "@/lib/market-planning/format";
import { bestOfMarkets, languageReach, topOpportunities, type LanguageReach, type ReachLevel } from "@/lib/market-planning/intel/dashboard";
import type { Country } from "@/lib/market-planning/types";
import ui from "../ui.module.css";
import m from "./settings.module.css";


type Filter = null | "selected" | "signals" | "reach" | string;

const REACH_LABEL: Record<ReachLevel, string> = { strong: "Language: strong", partial: "Language: partial", limited: "Language: limited", low: "Language: low", nodata: "Language: no data" };
const fmtPeople = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} million` : n >= 1000 ? `${Math.round(n / 1000).toLocaleString("en-US")},000` : String(n));

function reachTitle(r: LanguageReach, names: string): string {
  if (r.level === "nodata") return `We hold no ${names} language figures for this country, so reach is unknown (not zero).`;
  const who = r.speakers === null ? "" : r.speakers > 0 ? `${names} reaches about ${fmtPeople(r.speakers)} people here. ` : `${names} has no known audience here. `;
  const cost = Math.abs(r.cplFactor - 1) < 0.02 ? "Cost per lead stays at the benchmark." : `Cost per lead ${r.cplFactor > 1 ? "+" : "−"}${Math.round(Math.abs(r.cplFactor - 1) * 100)}% for your languages.`;
  return who + cost;
}

/** Bolds the part of a name that matches what was typed. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className={m.hl}>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function CountryRow({
  c,
  on,
  cplText,
  reach,
  langNames,
  showRegion,
  q,
  onToggle,
}: {
  c: Country;
  on: boolean;
  cplText: string;
  reach: LanguageReach | null;
  langNames: string;
  showRegion: boolean;
  q: string;
  onToggle: (iso2: string) => void;
}) {
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={on} className={`${m.country} ${on ? m.countryOn : ""}`} onClick={() => onToggle(c.iso2)}>
        <span className={`${m.check} ${on ? m.checkOn : ""}`} aria-hidden="true">
          {on ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.4l2.4 2.3 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </span>
        <Flag iso2={c.iso2} name={c.name} size={24} />
        <span className={m.countryText}>
          <span className={m.countryName}>
            <Highlight text={c.name} q={q} />
          </span>
          <span className={m.countrySub}>
            {showRegion ? `${c.region} · ` : ""}
            {marketClassLabel(c)} · {cplText}
          </span>
        </span>
        {c.demandRank !== null ? (
          <span className={m.signal} title={`Dubai property searches: ${c.name} is number ${c.demandRank} by international search interest, with ${c.demandSharePct}% of it (DXBinteract, secondary source). Not a count of buyers.`}>
            Searches #{c.demandRank} · {c.demandSharePct}%
          </span>
        ) : null}
        {reach ? (
          <span className={`${m.cov} ${m[`reach_${reach.level}`]}`} title={reachTitle(reach, langNames)}>
            {REACH_LABEL[reach.level]}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Choose markets: search all countries, browse them by region, see the strongest reported Dubai
 * property-interest signals, clear the selection (the best market stays) or go back to the recommendation.
 */
export default function MarketSettings({
  open,
  onOpenChange,
  onSplit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSplit: () => void;
}) {
  const { state, dispatch, rows, pct } = usePlanner();
  const [query, setQuery] = useState("");
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(null);
  const selected = state.shares;
  const selectedCount = Object.keys(selected).length;
  const opportunities = useMemo(() => topOpportunities(15), []);
  const q = query.trim().toLowerCase();
  const mine = useMemo(() => [...rows].sort((a, b) => b.share - a.share), [rows]);

  const cplText = (c: Country) => {
    const bench = clientCpl(c);
    const assumed = state.assumedCpl[c.iso2];
    const est = planningCpl(c);
    if (bench) return `${fmtCpl(bench)} per lead · your benchmark`;
    if (assumed) return `AED ${assumed} per lead · your own figure`;
    if (est) return `${fmtCpl(est)} per lead · estimate`;
    return "No lead cost yet";
  };

  const langNames = Object.keys(state.languages).map((code) => LANGUAGE_OPTIONS.find((o) => o.code === code)?.label ?? code).join(" and ");
  const reachMap = useMemo(() => {
    const out: Record<string, LanguageReach> = {};
    for (const c of COUNTRIES) out[c.iso2] = languageReach(c.iso2, state.languages);
    return out;
  }, [state.languages]);
  const reachOf = (c: Country): LanguageReach | null => reachMap[c.iso2] ?? null;
  const reachableCount = useMemo(() => COUNTRIES.filter((c) => ["strong", "partial", "limited"].includes(reachMap[c.iso2]?.level ?? "")).length, [reachMap]);
  const reachable = useCallback((c: Country) => {
    const lv = reachMap[c.iso2]?.level;
    return lv === "strong" || lv === "partial" || lv === "limited";
  }, [reachMap]);

  const toggle = (iso2: string) => {
    setNote(null);
    dispatch({ type: "toggleMarket", iso2 });
  };

  const clearAll = () => {
    const isos = Object.keys(selected);
    if (isos.length <= 1) return;
    const best = bestOfMarkets(isos, state.languages) ?? mine[0]?.iso2;
    if (!best) return;
    dispatch({ type: "removeMarkets", iso2s: isos.filter((i) => i !== best) });
    const name = COUNTRIES.find((c) => c.iso2 === best)?.name ?? best;
    setNote(`Cleared. ${name} stays: it is the strongest of the markets you had selected.`);
  };

  const active = q !== "" || filter !== null;
  const results = useMemo(() => {
    if (!active) return [];
    let list = COUNTRIES.slice();
    if (filter === "selected") list = list.filter((c) => c.iso2 in selected);
    else if (filter === "reach") list = list.filter(reachable).sort((a, b) => (reachMap[b.iso2]?.score ?? 0) - (reachMap[a.iso2]?.score ?? 0));
    else if (filter === "signals") list = list.filter((c) => c.demandRank !== null).sort((a, b) => (a.demandRank as number) - (b.demandRank as number));
    else if (filter) list = list.filter((c) => c.region === filter);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.iso2.toLowerCase() === q || c.region.toLowerCase().includes(q));
    return list.slice(0, 80);
  }, [active, filter, q, selected, reachMap, reachable]);

  const onEnter = () => {
    const first = results[0];
    if (!first) return;
    toggle(first.iso2);
    setQuery("");
    const now = first.iso2 in selected;
    setNote(now ? `Removed ${first.name}.` : `Added ${first.name}.`);
  };

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      fixedBody
      title="Target markets"
      lead={`${selectedCount} ${selectedCount === 1 ? "market" : "markets"} selected. Search any of the ${COUNTRIES.length} countries or pick from the groups.`}
      footer={
        <>
          <button type="button" className={m.btnSecondary} onClick={onSplit}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            Adjust budget by market
          </button>
          <button type="button" className={ui.btnPrimary} onClick={() => onOpenChange(false)}>
            Done
          </button>
        </>
      }
    >
      <div className={m.marketsLayout}>
        <div className={m.marketsMain}>
          <div className={m.marketsTop}>
          <label className={m.search}>
            <span className={m.searchIcon} aria-hidden="true">
              <Search size={17} />
            </span>
            <input
              className={m.searchInput}
              type="text"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Search a country or region"
              aria-label="Search all countries"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.stopPropagation();
                  setQuery("");
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  onEnter();
                }
              }}
            />
            {query ? (
              <>
                <span className={m.searchCount}>{results.length === 80 ? "80+" : results.length} found{results.length ? " · Enter to add" : ""}</span>
                <button type="button" className={m.searchClear} aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} aria-hidden="true" />
                </button>
              </>
            ) : (
              <span className={m.searchCount}>{COUNTRIES.length} countries</span>
            )}
          </label>
          <button type="button" role="switch" aria-checked={filter === "reach"} className={`${m.reachToggle} ${filter === "reach" ? m.reachToggleOn : ""}`} onClick={() => setFilter(filter === "reach" ? null : "reach")}>
            <span className={m.reachSwitch} aria-hidden="true"><span /></span>
            <span className={m.reachText}>
              <b>Only countries reachable in {langNames}</b>
              <small>{reachableCount} of {COUNTRIES.length} · best reach first</small>
            </span>
          </button>
          <div className={m.filters} role="group" aria-label="Quick filters">
            {[
              { id: null as Filter, label: "All" },
              { id: "selected" as Filter, label: `Selected (${selectedCount})` },
              { id: "signals" as Filter, label: "Top signals" },
              ...REGIONS.map((g) => ({ id: g.name as Filter, label: `${g.name} (${g.countries.length})` })),
            ].map((f) => (
              <button key={String(f.id)} type="button" className={`${m.filterChip} ${filter === f.id ? m.filterOn : ""}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          <div className={m.mine}>
            <div className={m.mineHead}>
              <span className={m.label} style={{ margin: 0 }}>
                Your markets ({selectedCount})
              </span>
              <span className={m.mineActions}>
                <button type="button" className={m.linkBtn} onClick={clearAll} disabled={selectedCount <= 1} title="Remove all but the strongest market">
                  <Trash2 size={13} aria-hidden="true" /> Clear all
                </button>
                <button type="button" className={m.linkBtn} onClick={() => { setNote(null); dispatch({ type: "resetMarkets" }); }} title="Go back to the recommended markets">
                  <RotateCcw size={13} aria-hidden="true" /> Reset to recommended
                </button>
              </span>
            </div>
            <ul className={m.mineChips} aria-label="Selected markets">
              {mine.map((r) => (
                <li key={r.iso2} className={m.mineChip}>
                  <Flag iso2={r.iso2} name={r.country.name} />
                  <span>{r.country.name}</span>
                  <b>{pct[r.iso2] ?? 0}%</b>
                  <button type="button" className={m.chipX} aria-label={`Remove ${r.country.name}`} disabled={selectedCount <= 1} onClick={() => toggle(r.iso2)}>
                    <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {note ? <p className={m.note} role="status">{note}</p> : null}
          </div>
          </div>

          <div className={m.marketsScroll}>
          {active && !(filter === "reach" && !q) ? (
            <div className={m.status} role="status">
              <span>
                {results.length === 80 ? "80+" : results.length} {results.length === 1 ? "country" : "countries"}
                {filter === "reach" ? ` reachable in ${langNames}, best reach first` : filter === "selected" ? " selected" : filter === "signals" ? " with the strongest Dubai searches" : filter ? ` in ${filter.replace(/ \(\d+\)$/, "")}` : ""}
                {q ? ` matching “${query}”` : ""}
              </span>
              <button type="button" className={m.linkBtn} onClick={() => { setFilter(null); setQuery(""); }}>
                <X size={13} aria-hidden="true" /> Clear filters
              </button>
            </div>
          ) : null}
          {active ? (
            results.length ? (
              <ul className={m.countryList} aria-label="Search results">
                {results.map((c) => (
                  <CountryRow key={c.iso2} c={c} on={c.iso2 in selected} cplText={cplText(c)} reach={reachOf(c)} langNames={langNames} showRegion q={q} onToggle={toggle} />
                ))}
              </ul>
            ) : (
              <p className={m.hint}>{q ? `No country matches “${query}”.` : "Nothing here yet."}</p>
            )
          ) : (
            <div className={m.groups}>
              {REGIONS.map((g) => {
                const count = g.countries.filter((c) => c.iso2 in selected).length;
                const isOpen = openRegions[g.name] ?? count > 0;
                return (
                  <section key={g.name} className={m.group}>
                    <button type="button" className={m.groupHead} aria-expanded={isOpen} onClick={() => setOpenRegions((o) => ({ ...o, [g.name]: !isOpen }))}>
                      <span className={m.groupName}>{g.name}</span>
                      <span className={m.groupCount}>
                        {count > 0 ? `${count} selected · ` : ""}
                        {g.countries.filter(reachable).length} of {g.countries.length} reachable in {langNames}
                      </span>
                      <ChevronDown size={16} aria-hidden="true" className={isOpen ? m.chevOpen : m.chev} />
                    </button>
                    {isOpen ? (
                      <ul className={m.countryList}>
                        {g.countries.map((c) => (
                          <CountryRow key={c.iso2} c={c} on={c.iso2 in selected} cplText={cplText(c)} reach={reachOf(c)} langNames={langNames} showRegion={false} q="" onToggle={toggle} />
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
          </div>
        </div>

        <aside className={m.marketsSide} aria-label="Strongest Dubai opportunity markets">
          <h3 className={m.sideTitle}>Strongest Dubai opportunity markets</h3>
          <p className={m.sideNote}>
            Combines Dubai property-interest searches (DXBinteract, secondary source) with buyer potential: financial capacity, investment motivations, readiness to invest abroad, reachable audience and language fit. Estimates, not a count of buyers or sales. Markets with low search interest can still rank high.
          </p>
          <ol className={m.signals}>
            {opportunities.map((o, i) => {
              const c = COUNTRIES.find((x) => x.iso2 === o.iso2);
              if (!c) return null;
              const on = c.iso2 in selected;
              return (
                <li key={c.iso2}>
                  <OpportunityTip iso2={c.iso2} name={c.name}>
                  <button type="button" className={`${m.signalRow} ${on ? m.signalOn : ""}`} aria-pressed={on} onClick={() => toggle(c.iso2)} title={`${on ? "Remove" : "Add"} ${c.name}${o.dubaiInterest === null ? " (not in the top Dubai search-interest list: potential market)" : ""}`}>
                    <span className={m.rank}>{i + 1}</span>
                    <Flag iso2={c.iso2} name={c.name} />
                    <span className={m.signalText}>
                      <span className={m.signalName}>{c.name}</span>
                      <span className={m.signalBar} aria-hidden="true">
                        <span style={{ width: `${o.score}%` }} />
                      </span>
                    </span>
                    <span className={m.signalPct}>{o.score}</span>
                    <span className={`${m.signalAdd} ${on ? m.signalAddOn : ""}`} aria-hidden="true">
                      {on ? "✓" : "+"}
                    </span>
                  </button>
                  </OpportunityTip>
                </li>
              );
            })}
          </ol>
          <p className={m.sideNote}>Score is relative to the best market (100). A market without Dubai search data is a potential market, ranked on its other strengths.</p>
        </aside>
      </div>
    </SettingsDialog>
  );
}
