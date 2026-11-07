"use client";

import { uiLanguages } from "../planner-state";
import { useState } from "react";
import { PanelHead } from "../ui";
import { usePlanner } from "../planner-context";
import {
  CONFIDENCE_LABEL,
  COUNTRY_BY_ISO,
  RELATIONSHIP_LABEL,
  languageLabel,
  matureCpl,
  planningCpl,
} from "@/lib/market-planning/catalog";
import LanguageHeatmap from "../charts/LanguageHeatmap";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

export default function LanguageOpportunities() {
  const { discovery, state, dispatch, openDetail } = usePlanner();
  const [tab, setTab] = useState<"primary" | "diaspora">("primary");
  const hasLanguages = Object.keys(uiLanguages(state.languages)).length > 0;
  const list = discovery[tab];

  const sorted = [...list].sort((a, b) => {
    const ca = COUNTRY_BY_ISO.get(a.iso2);
    const cb = COUNTRY_BY_ISO.get(b.iso2);
    const bench = Number(!!(cb && matureCpl(cb))) - Number(!!(ca && matureCpl(ca)));
    return bench || (cb?.demandSharePct ?? -1) - (ca?.demandSharePct ?? -1) || (ca?.name ?? "").localeCompare(cb?.name ?? "");
  });
  const notInPlan = sorted.filter((c) => !(c.iso2 in state.shares)).map((c) => c.iso2);

  return (
    <section className={ui.panel} id="opportunities" aria-labelledby="opp-title">
      <PanelHead
        id="opp-title"
        title="Language-led market opportunities"
        copy="Markets your team can serve in the languages you selected, including diaspora communities outside the countries where a language is official. A language opportunity is not proven advertising performance."
      />

      {!hasLanguages ? (
        <div className={ui.callout}>
          <span>
            Select the languages your agents support to see matching markets. For example, Arabic support
            can open opportunities in core Arabic-speaking markets and in diaspora communities across Europe,
            North America and other international hubs. Diaspora estimates are shown separately from
            resident-country language statistics.
          </span>
        </div>
      ) : (
        <>
          <LanguageHeatmap />
          <div className={ui.segmented} role="tablist" style={{ marginTop: 14 }} aria-label="Opportunity type">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "primary"}
              className={ui.segment}
              onClick={() => setTab("primary")}
            >
              Primary-language markets ({discovery.primary.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "diaspora"}
              className={ui.segment}
              onClick={() => setTab("diaspora")}
            >
              Diaspora opportunities ({discovery.diaspora.length})
            </button>
          </div>

          <p className={ui.subtle} style={{ margin: "12px 2px 0" }}>
            {tab === "primary"
              ? "The language is official, dominant or widely used. Audience size is not available until a defined, sourced language statistic is added."
              : "Diaspora-origin proxies: communities with a migrant link to a language-origin country. They are not speaker counts and not exact ad reach."}
          </p>

          {sorted.length === 0 ? (
            <p className={f.invalid} style={{ marginTop: 12 }}>
              None of your selected languages has {tab === "primary" ? "primary-language" : "diaspora"} market
              mapping yet. Market mapping for these languages is research pending.
            </p>
          ) : (
            <>
              <div className={f.subhead} style={{ margin: "14px 0 0" }}>
                <span className={f.hint}>
                  {sorted.length} market{sorted.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className={ui.btnSoft}
                  disabled={notInPlan.length === 0}
                  onClick={() => dispatch({ type: "addMarkets", iso2s: notInPlan })}
                >
                  {notInPlan.length === 0 ? "All in plan" : `Add ${notInPlan.length} to plan`}
                </button>
              </div>
              <ul className={f.oppList}>
                {sorted.map((c) => {
                  const country = COUNTRY_BY_ISO.get(c.iso2);
                  if (!country) return null;
                  const inPlan = c.iso2 in state.shares;
                  return (
                    <li key={c.iso2} className={f.opp}>
                      <div>
                        <div className={f.oppName}>
                          <button type="button" className={f.oppLink} onClick={() => openDetail({ kind: "country", iso2: c.iso2 })}>
                            {country.name}
                          </button>
                          <span className={`${f.tag} ${c.coverage === "full" ? f.tagGreen : f.tagAmber}`}>
                            {c.coverage === "full" ? "Full coverage" : "Limited coverage"}
                          </span>
                          <span className={f.tag}>{c.languages.map(languageLabel).join(" · ")}</span>
                        </div>
                        <div className={f.oppMeta}>
                          {RELATIONSHIP_LABEL[c.relationship] ?? c.relationship} ·{" "}
                          {CONFIDENCE_LABEL[c.confidence] ?? c.confidence}, research pending · Audience size: not
                          available
                          {planningCpl(country) ? "" : " · CPL research pending"}
                        </div>
                      </div>
                      <div className={f.oppActions}>
                        <button
                          type="button"
                          className={inPlan ? ui.btnLine : ui.btnSoft}
                          onClick={() => dispatch({ type: "toggleMarket", iso2: c.iso2 })}
                          aria-pressed={inPlan}
                          disabled={inPlan && Object.keys(state.shares).length === 1}
                        >
                          {inPlan ? "In plan · Remove" : "Add to plan"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
