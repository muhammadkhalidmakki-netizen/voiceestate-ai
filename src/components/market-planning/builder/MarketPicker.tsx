"use client";

import { uiLanguages } from "../planner-state";
import { useMemo, useState } from "react";
import { PanelHead, Chevron } from "../ui";
import { usePlanner } from "../planner-context";
import {
  COUNTRIES,
  REGIONS,
  clientCpl,
  planningCpl,
  marketClassLabel,
} from "@/lib/market-planning/catalog";
import { marketCoverage } from "@/lib/market-planning/coverage";
import { fmtCpl } from "@/lib/market-planning/format";
import type { Country } from "@/lib/market-planning/types";
import { LANGUAGE_SEEDS } from "@/lib/market-planning/catalog";
import ui from "../ui.module.css";
import b from "./builder.module.css";

const GROUPS: Array<{ cls: NonNullable<Country["marketClass"]>; title: string; hint: string }> = [
  { cls: "core_candidate", title: "Core opportunity", hint: "Strongest reported Dubai property-interest signals" },
  { cls: "test_candidate", title: "Worth testing", hint: "Credible signal; economics need a controlled test" },
  { cls: "benchmark_market", title: "Monitor", hint: "Client benchmark exists; demand research pending" },
];

function Check({ on }: { on: boolean }) {
  return (
    <span className={`${b.check} ${on ? b.checkOn : ""}`} aria-hidden="true">
      {on ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.4l2.4 2.3 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

function CountryRow({ country }: { country: Country }) {
  const { state, dispatch, openDetail, focus } = usePlanner();
  const selected = country.iso2 in state.shares;
  const benchmark = clientCpl(country);
  const assumed = state.assumedCpl[country.iso2];
  const langs = uiLanguages(state.languages);
  const hasLang = Object.keys(langs).length > 0;
  const cov = hasLang ? marketCoverage(country.iso2, langs, LANGUAGE_SEEDS) : null;
  const focused = focus?.kind === "country" && focus.iso2 === country.iso2;

  const modelled = planningCpl(country);
  let cplText = "No lead cost yet";
  if (benchmark) cplText = `${fmtCpl(benchmark)} per lead · your benchmark`;
  else if (assumed) cplText = `AED ${assumed} per lead · your own figure`;
  else if (modelled) cplText = `${fmtCpl(modelled)} per lead · estimate`;

  return (
    <li className={`${b.row} ${selected ? b.rowOn : ""} ${focused ? b.rowFocus : ""}`}>
      <button
        type="button"
        className={b.rowToggle}
        role="checkbox"
        aria-checked={selected}
        aria-label={`${selected ? "Remove" : "Add"} ${country.name}`}
        onClick={() => dispatch({ type: "toggleMarket", iso2: country.iso2 })}
      >
        <Check on={selected} />
      </button>
      <button type="button" className={b.rowMain} onClick={() => openDetail({ kind: "country", iso2: country.iso2 })}>
        <span className={b.rowName}>{country.name}</span>
        <span className={b.rowSub}>
          {marketClassLabel(country)} · {cplText}
        </span>
      </button>
      {cov ? (
        <span
          className={`${b.cov} ${cov.status === "full" ? b.covFull : cov.status === "limited" ? b.covLimited : ""}`}
          title={
            cov.status === "full"
              ? "Your team covers a language mapped to this market"
              : cov.status === "limited"
                ? "Conversational coverage only"
                : cov.status === "gap"
                  ? "No selected language is mapped to this market"
                  : "Language mapping research pending"
          }
        >
          {cov.status === "full" ? "Covered" : cov.status === "limited" ? "Limited" : cov.status === "gap" ? "Gap" : "Not mapped"}
        </span>
      ) : null}
    </li>
  );
}

export default function MarketPicker() {
  const { state, dispatch } = usePlanner();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();
  const selectedCount = Object.keys(state.shares).length;

  const results = useMemo(
    () => (q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 60) : []),
    [q],
  );
  const recommended = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        countries: COUNTRIES.filter((c) => c.marketClass === g.cls).sort(
          (a, c) => (c.demandSharePct ?? -1) - (a.demandSharePct ?? -1),
        ),
      })),
    [],
  );
  const withCpl = Object.keys(state.shares).filter((iso) => {
    const c = COUNTRIES.find((x) => x.iso2 === iso);
    return c && (planningCpl(c) || state.assumedCpl[iso]);
  }).length;

  return (
    <section id="markets" aria-labelledby="markets-title">
      <PanelHead
        id="markets-title"
        title="Where should we find your next buyers?"
        copy="Explore recommended international markets for Dubai property acquisition. Start with the suggested portfolio or customize your own combination of countries."
      />

      <div className={b.marketBar}>
        <p className={b.marketCount} aria-live="polite">
          <strong>{selectedCount}</strong> {selectedCount === 1 ? "market" : "markets"} in plan · {withCpl} with a CPL
        </p>
        <button type="button" className={ui.btnLine} onClick={() => dispatch({ type: "resetMarkets" })}>
          Reset to recommendations
        </button>
      </div>

      <label className={b.search}>
        <span className={ui.visuallyHidden}>Search all countries</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.7" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search all 249 countries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {q ? (
        <div>
          <p className={b.groupLabel}>
            {results.length === 0 ? "No countries match" : `${results.length} result${results.length === 1 ? "" : "s"}`}
          </p>
          <ul className={b.list}>
            {results.map((c) => (
              <CountryRow key={c.iso2} country={c} />
            ))}
          </ul>
        </div>
      ) : (
        <>
          {recommended.map((g) => (
            <div key={g.cls} className={b.group}>
              <div className={b.groupHead}>
                <p className={b.groupLabel}>{g.title}</p>
                <span className={b.groupHint}>{g.hint}</span>
              </div>
              <ul className={b.list}>
                {g.countries.map((c) => (
                  <CountryRow key={c.iso2} country={c} />
                ))}
              </ul>
            </div>
          ))}

          <div className={b.group}>
            <div className={b.groupHead}>
              <p className={b.groupLabel}>Browse every region</p>
              <span className={b.groupHint}>Research pending for most countries</span>
            </div>
            {REGIONS.map((r) => {
              const inPlan = r.countries.filter((c) => c.iso2 in state.shares).length;
              const isOpen = !!open[r.name];
              return (
                <div key={r.name} className={b.region}>
                  <div className={b.regionHead}>
                    <button
                      type="button"
                      className={b.regionToggle}
                      aria-expanded={isOpen}
                      onClick={() => setOpen((o) => ({ ...o, [r.name]: !o[r.name] }))}
                    >
                      <Chevron className={`${b.regionChevron} ${isOpen ? b.regionChevronOpen : ""}`} />
                      <span className={b.regionName}>{r.name}</span>
                      <span className={b.regionCount}>
                        {inPlan}/{r.countries.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={ui.btnSoft}
                      onClick={() => dispatch({ type: "addMarkets", iso2s: r.countries.map((c) => c.iso2) })}
                      disabled={inPlan === r.countries.length}
                      title={`Adds every ${r.name} country, including ones with no benchmark yet`}
                    >
                      Add all
                    </button>
                    <button
                      type="button"
                      className={ui.btnSoft}
                      onClick={() => dispatch({ type: "removeMarkets", iso2s: r.countries.map((c) => c.iso2) })}
                      disabled={inPlan === 0}
                    >
                      Remove
                    </button>
                  </div>
                  {isOpen ? (
                    <ul className={b.list}>
                      {r.countries.map((c) => (
                        <CountryRow key={c.iso2} country={c} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
