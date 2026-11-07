"use client";

import { PanelHead } from "../ui";
import { usePlanner } from "../planner-context";
import { LANGUAGE_OPTIONS, isLanguageMapped } from "@/lib/market-planning/catalog";
import type { Proficiency } from "@/lib/market-planning/types";
import ui from "../ui.module.css";
import b from "./builder.module.css";

const LEVELS: Array<{ id: Proficiency; label: string }> = [
  { id: "fluent", label: "Fluent" },
  { id: "professional", label: "Professional" },
  { id: "conversational", label: "Conversational" },
];

export default function LanguagePicker() {
  const { state, dispatch, discovery } = usePlanner();
  const selected = LANGUAGE_OPTIONS.filter((l) => state.languages[l.code]);

  return (
    <section id="languages" aria-labelledby="lang-title">
      <PanelHead
        id="lang-title"
        title="Which languages can your team support?"
        copy="Discover international audiences your team can communicate with. Your opportunities may extend beyond countries where a language is officially spoken."
      />

      <div className={b.chips} role="group" aria-label="Sales agent languages">
        {LANGUAGE_OPTIONS.map((l) => {
          const on = !!state.languages[l.code];
          return (
            <button
              key={l.code}
              type="button"
              className={`${b.chip} ${on ? b.chipOn : ""}`}
              aria-pressed={on}
              onClick={() => dispatch({ type: "toggleLanguage", code: l.code })}
            >
              {l.code === "other" ? "Other languages" : l.label}
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <ul className={b.langList}>
          {selected.map((l) => (
            <li key={l.code} className={b.langRow}>
              <div className={b.langHead}>
                <span className={b.langName}>{l.code === "other" ? "Other languages" : l.label}</span>
                {!isLanguageMapped(l.code) ? (
                  <span className={b.langWarn}>Market mapping research pending</span>
                ) : null}
              </div>
              <div className={ui.segmented} role="radiogroup" aria-label={`${l.label} proficiency`}>
                {LEVELS.map((lv) => (
                  <button
                    key={lv.id}
                    type="button"
                    role="radio"
                    aria-checked={state.languages[l.code] === lv.id}
                    className={`${ui.segment} ${ui.segmentSmall}`}
                    onClick={() => dispatch({ type: "setProficiency", code: l.code, level: lv.id })}
                  >
                    {lv.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={b.empty}>
          Select the languages your agents can follow up in. Your selections reshape the market
          recommendations on the right.
        </p>
      )}

      {selected.length > 0 ? (
        <p className={b.note} aria-live="polite">
          Opens <strong>{discovery.primary.length}</strong> primary-language and{" "}
          <strong>{discovery.diaspora.length}</strong> diaspora-proxy market
          {discovery.primary.length + discovery.diaspora.length === 1 ? "" : "s"}. Fluent and professional
          coverage count as full service; conversational is limited.
        </p>
      ) : null}
    </section>
  );
}
