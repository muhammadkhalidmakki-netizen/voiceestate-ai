"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import sourcesJson from "@/lib/market-planning/data/intel/sources.json";
import v from "./v2.module.css";
import h from "./insights-home.module.css";

type Category = "client" | "official" | "research" | "estimate" | "gap";
type Source = {
  id: string;
  category: Category;
  label: string;
  period: string;
  url: string;
  access: string;
  status: string;
  reliability: string;
  limitation: string;
  used_for: string;
  used: boolean;
};

const SOURCES = sourcesJson as unknown as Source[];

const GROUPS: Array<{ id: Category | "all"; label: string; hint: string; color: string }> = [
  { id: "all", label: "All sources", hint: "Everything the dashboard is built from", color: "" },
  { id: "client", label: "From the client", hint: "Your own figures and research", color: "#3b7bff" },
  { id: "official", label: "Official data", hint: "Statistics offices and international bodies", color: "#12b76a" },
  { id: "research", label: "Research and reports", hint: "Datasets, industry reports and our own model", color: "#8b6cf0" },
  { id: "estimate", label: "Rough estimates", hint: "Estimates and secondary figures: use with care", color: "#f59a23" },
  { id: "gap", label: "Not used yet", hint: "Sources we could not access or have not used", color: "#9aa6bd" },
];

const RELIABILITY: Record<string, string> = {
  official: "Official figures",
  official_statistics_dated: "Official, may be dated",
  high_authority_blended_not_country_level: "Client data (regional)",
  directional: "Directional only",
  survey: "Survey",
  survey_intention: "Survey of intentions",
  industry_data_unverified: "Unverified industry data",
  estimate_unverified: "Rough estimate",
  academic_imputation: "Modelled research data",
  reference_dataset: "Reference data",
  user_supplied: "Typed in by you",
  seed: "Your research queue",
  standard: "Standard",
  model_output: "Our model",
  gap: "Missing",
};

const STATUS_TEXT = (s: Source): string =>
  s.category === "gap" ? "Not used" : s.status === "NOT_VERIFIED" ? "Not verified" : s.status === "RETRIEVED_VIA_SEARCH_SUMMARY" || s.status === "RETRIEVED_SECONDARY" ? "Read from a summary" : s.status === "RETRIEVED" ? "Downloaded" : "Provided";

/** Where every number comes from: the sources behind the dashboard, how reliable each is, and what it is used for. */
export default function DataTab() {
  const [group, setGroup] = useState<Category | "all">("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: SOURCES.length };
    for (const s of SOURCES) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SOURCES.filter((s) => (group === "all" || s.category === group) && (!needle || `${s.label} ${s.used_for} ${s.limitation}`.toLowerCase().includes(needle)));
  }, [group, q]);

  const color = (c: Category) => GROUPS.find((g) => g.id === c)?.color ?? "#9aa6bd";

  return (
    <div className={v.stack}>
      <section className={v.card} aria-labelledby="src-title">
        <div className={v.cardHead}>
          <div>
            <h2 id="src-title" className={v.cardTitle}>Sources</h2>
            <p className={v.cardSub}>
              Everything the dashboard&rsquo;s numbers are built from. Official sources are the strongest; rough estimates and unverified figures are labelled so you can see where the weak spots are.
            </p>
          </div>
        </div>

        <div className={h.tools}>
          <label className={h.search}>
            <Search size={15} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sources, for example census or Eurostat" aria-label="Search sources" />
            {q ? (
              <button type="button" className={h.clear} aria-label="Clear search" onClick={() => setQ("")}>
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </label>
        </div>

        <div className={h.srcFilters} role="group" aria-label="Filter sources">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" className={`${h.segOpt} ${group === g.id ? h.segOptOn : ""}`} style={{ ["--sc" as string]: g.color || "var(--mp-navy)" }} aria-pressed={group === g.id} title={g.hint} onClick={() => setGroup(g.id)}>
              {g.color ? <span className={h.segDot} aria-hidden="true" /> : null}
              <span>{g.label}</span>
              <b>{counts[g.id] ?? 0}</b>
            </button>
          ))}
        </div>

        <ul className={h.srcList}>
          {list.map((s) => (
            <li key={s.id} className={h.srcCard} style={{ ["--sc" as string]: color(s.category) }}>
              <div className={h.srcHead}>
                <b>{s.label}</b>
              </div>
              <div className={h.srcTags}>
                <span className={h.srcTag}>{RELIABILITY[s.reliability] ?? s.reliability.replace(/_/g, " ")}</span>
                <span className={`${h.srcTag} ${h.srcTagStatus}`}>{STATUS_TEXT(s)}</span>
                {s.period ? <span className={h.srcTag}>{s.period}</span> : null}
              </div>
              {s.used_for ? (
                <p className={h.srcLine}>
                  <b>Used for</b> {s.used_for}
                </p>
              ) : null}
              {s.limitation ? (
                <p className={h.srcLine}>
                  <b>Limits</b> {s.limitation}
                </p>
              ) : null}
              {s.url ? (
                <a className={h.srcLink} href={s.url} target="_blank" rel="noopener noreferrer">
                  Open source <ExternalLink size={12} aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
          {list.length === 0 ? <li className={h.empty}>No source matches.</li> : null}
        </ul>
      </section>
    </div>
  );
}
