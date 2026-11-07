"use client";

import { uiLanguages } from "./planner-state";
import { EvidencePill } from "./ui";
import { LiveRange } from "./viz";
import { usePlanner, type Detail, type MarketRow } from "./planner-context";
import {
  CHANNEL_RATES,
  CONFIDENCE_LABEL,
  COUNTRY_BY_ISO,
  DATASET_VERSION,
  DEMAND_SIGNAL_DEFINITION,
  EUROPE_PATTERN,
  LANGUAGE_SEEDS,
  LEARNING_CPL,
  RELATIONSHIP_LABEL,
  cplProvenance,
  languageLabel,
  marketClassLabel,
  clientCpl,
  planningCpl,
  reasonFor,
  sourceById,
} from "@/lib/market-planning/catalog";
import { marketCoverage } from "@/lib/market-planning/coverage";
import { overrideCpl } from "@/lib/market-planning/intel/data";
import { eventualSales } from "@/lib/market-planning/sales";
import {
  fmtAed,
  fmtAedRange,
  fmtCpl,
  fmtCplRange,
  fmtLeadsRange,
  fmtPct,
} from "@/lib/market-planning/format";
import ui from "./ui.module.css";
import d from "./drawer.module.css";

export function detailTitle(detail: Exclude<Detail, null>, rows: MarketRow[]): string {
  void rows;
  if (detail.kind === "country") return COUNTRY_BY_ISO.get(detail.iso2)?.name ?? detail.iso2;
  if (detail.kind === "channel") return detail.channel === "meta" ? "Meta Ads investment" : "Google Ads investment";
  return {
    investment: "Monthly media investment",
    leads: "Estimated leads",
    cpl: "Blended CPL",
    coverage: "Benchmark coverage",
    sales: "Eventual sales (illustrative)",
  }[detail.metric];
}

export function DetailBody({ detail }: { detail: Exclude<Detail, null> }) {
  if (detail.kind === "country") return <CountryDetail iso2={detail.iso2} />;
  if (detail.kind === "channel") return <ChannelDetail channel={detail.channel} />;
  return <MetricDetail metric={detail.metric} />;
}

function Source({ id }: { id: string }) {
  const s = sourceById(id);
  if (!s) return null;
  const urls = s.urls ?? (s.url ? [s.url] : []);
  return (
    <p>
      <strong>{s.label}</strong>
      {s.date || s.period ? ` (${s.period ?? s.date})` : ""}
      {urls.map((u) => (
        <a key={u} className={d.src} href={u} target="_blank" rel="noopener noreferrer">
          {u}
        </a>
      ))}
    </p>
  );
}

/* ---------------- Country ---------------- */

function CountryDetail({ iso2 }: { iso2: string }) {
  const { state, dispatch, rows, pct: pcts } = usePlanner();
  const country = COUNTRY_BY_ISO.get(iso2);
  if (!country) return <p>Unknown country.</p>;
  const row = rows.find((r) => r.iso2 === iso2);
  const inPlan = !!row;
  const benchmark = clientCpl(country);
  const modelled = planningCpl(country);
  const prov = benchmark && !overrideCpl(iso2) ? cplProvenance(iso2) : null;
  const learning = LEARNING_CPL[iso2];
  const reason = reasonFor(iso2);
  const seeds = LANGUAGE_SEEDS.filter((s) => s.iso2 === iso2);
  const langs = uiLanguages(state.languages);
  const hasLang = Object.keys(langs).length > 0;
  const cov = hasLang ? marketCoverage(iso2, langs, LANGUAGE_SEEDS) : null;
  const pct = pcts[iso2] ?? 0;

  return (
    <>
      <div className={d.pills}>
        <EvidencePill kind={country.marketClass ? "external" : "pending"} label={marketClassLabel(country)} />
        <EvidencePill kind="pending" label={country.region} />
      </div>

      <div className={d.card}>
        <div className={d.actions} style={{ justifyContent: "space-between" }}>
          <strong>{inPlan ? "In your plan" : "Not in your plan"}</strong>
          <button
            type="button"
            className={inPlan ? ui.btnLine : ui.btnPrimary}
            disabled={inPlan && rows.length === 1}
            onClick={() => dispatch({ type: "toggleMarket", iso2 })}
          >
            {inPlan ? "Remove from plan" : "Add to plan"}
          </button>
        </div>
        {inPlan && row ? (
          <>
            <input
              type="range"
              className={ui.slider}
              min={0}
              max={100}
              step={1}
              value={pct}
              aria-label={`${country.name} share of budget`}
              style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${pct}%, var(--mp-tint-2) ${pct}%)`, marginTop: 8 }}
              onChange={(e) => dispatch({ type: "setShare", iso2, share: Number(e.target.value) / 100 })}
            />
            <dl className={d.kv}>
              <dt>Budget share</dt>
              <dd>{pct}%</dd>
              <dt>Investment in this market</dt>
              <dd>{fmtAedRange(row.spend) ?? "—"}</dd>
              <dt>Estimated leads</dt>
              <dd>{fmtLeadsRange(row.leads) ?? "Not yet validated"}</dd>
            </dl>
          </>
        ) : null}
      </div>

      <div className={d.block}>
        <h3>Why this market appears</h3>
        <p>{reason ?? "No recommendation rationale has been researched for this country yet. It stays selectable so you can plan for it."}</p>
      </div>

      <div className={d.block}>
        <h3>Dubai property-interest signal</h3>
        {country.demandRank !== null && country.demandSharePct !== null ? (
          <>
            <p className={d.big}>#{country.demandRank} · {country.demandSharePct}%</p>
            <p>Reported share of international Dubai property interest, June–August 2026.</p>
            <p>{DEMAND_SIGNAL_DEFINITION}</p>
            <EvidencePill kind="external" label="External research · directional" />
          </>
        ) : (
          <p>
            No Dubai-demand figure is available for this market yet. <EvidencePill kind="pending" />
          </p>
        )}
      </div>

      <div className={d.block}>
        <h3>Acquisition cost (CPL)</h3>
        {benchmark ? (
          <>
            <p className={d.big}>{fmtCpl(benchmark)}</p>
            <p>
              This is your <strong>{country.benchmarkRegion}</strong> benchmark, applied to {country.name}. It is
              not a measured {country.name} figure.
            </p>
            {prov ? (
              <dl className={d.kv}>
                <dt>Confidence</dt>
                <dd>{CONFIDENCE_LABEL[prov.confidence] ?? prov.confidence}</dd>
                <dt>Campaign stage</dt>
                <dd style={{ textTransform: "capitalize" }}>{prov.stage}</dd>
                <dt>Supplied</dt>
                <dd>{prov.sourceDate}</dd>
              </dl>
            ) : null}
            {prov ? <p style={{ marginTop: 8 }}>{prov.scopeNote}</p> : null}
            <p>
              Learning-phase CPL:{" "}
              {learning !== undefined ? <strong>{fmtAed(learning)}</strong> : <em>not yet supplied for this region</em>}.
            </p>
            <EvidencePill kind="client" />
          </>
        ) : (
          <>
            {modelled ? (
              <p>
                You have no benchmark for {country.name}. The plan uses an estimate of{" "}
                <strong>{fmtCpl(modelled)}</strong> per lead: low confidence, with a safety margin added, and not a
                measured result. Enter your own figure below to replace it.
              </p>
            ) : (
              <p>
                No client CPL benchmark maps to {country.name}. It is shown as research pending and adds no
                estimated leads unless you enter your own cost per lead below.
              </p>
            )}
            {inPlan ? (
              <label className={ui.field}>
                <span className={ui.fieldLabel}>Your own cost per lead (optional)</span>
                <span className={ui.inputWrap}>
                  <span className={ui.affix}>AED</span>
                  <input
                    className={ui.input}
                    inputMode="decimal"
                    defaultValue={state.assumedCpl[iso2] ?? ""}
                    placeholder="e.g. 90"
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/,/g, ""));
                      dispatch({ type: "setAssumedCpl", iso2, value: Number.isFinite(n) && n > 0 ? n : null });
                    }}
                  />
                </span>
                <span className={ui.subtle} style={{ display: "block", marginTop: 6 }}>
                  Used in the forecast and labelled as your own figure. It is not a client benchmark or research result.
                </span>
              </label>
            ) : (
              <p>Add it to your plan to enter your own cost per lead.</p>
            )}
            <EvidencePill kind={state.assumedCpl[iso2] || modelled ? "assumption" : "pending"} label={!state.assumedCpl[iso2] && modelled ? "Estimate" : undefined} />
          </>
        )}
      </div>

      <div className={d.block}>
        <h3>Language fit</h3>
        {seeds.length === 0 ? (
          <p>No language mapping has been researched for this country yet. <EvidencePill kind="pending" /></p>
        ) : (
          <ul>
            {seeds.map((s) => (
              <li key={`${s.code}-${s.relationship}`}>
                {languageLabel(s.code)} · {RELATIONSHIP_LABEL[s.relationship] ?? s.relationship}
                {s.diaspora ? " (not a speaker count)" : ""}
              </li>
            ))}
          </ul>
        )}
        {cov ? (
          <p style={{ marginTop: 8 }}>
            Your team:{" "}
            <strong>
              {cov.status === "full"
                ? "full coverage"
                : cov.status === "limited"
                  ? "limited coverage (conversational)"
                  : cov.status === "gap"
                    ? "no selected language is mapped to this market"
                    : "language mapping research pending"}
            </strong>
            .
          </p>
        ) : (
          <p style={{ marginTop: 8 }}>Select your agent languages to see coverage for this market.</p>
        )}
      </div>

      <div className={d.block}>
        <h3>Sources</h3>
        <Source id="SRC_CLIENT_BENCHMARK_2026_11" />
        {country.demandRank !== null ? <Source id="SRC_DXBINTERACT_SECONDARY_2026" /> : null}
        <p>Dataset {DATASET_VERSION}.</p>
      </div>
    </>
  );
}

/* ---------------- Metric ---------------- */

function MetricDetail({ metric }: { metric: "investment" | "leads" | "cpl" | "coverage" | "sales" }) {
  const { plan, state, rows, effectiveCloseRate } = usePlanner();
  const isBudget = plan.mode === "budget";
  const covered = rows.filter((r) => r.cpl);
  const pending = rows.filter((r) => !r.cpl);

  if (metric === "investment") {
    return (
      <>
        <div className={d.block}>
          <p className={d.big}>{plan.valid ? <LiveRange range={plan.budget} kind="aed" fallback="Not yet available" /> : "Enter a valid amount"}</p>
          <EvidencePill kind={isBudget ? "input" : plan.usesAssumption ? "assumption" : "client"} />
        </div>
        <div className={d.block}>
          <h3>How it is calculated</h3>
          {isBudget ? (
            <>
              <code className={d.formula}>investment = the monthly budget you entered</code>
              <p>Advertising spend only. Agency fees, creative production, landing pages, CRM costs and taxes are excluded.</p>
            </>
          ) : (
            <>
              <code className={d.formula}>
                required budget = target leads ÷ (sum of share ÷ CPL across markets with a CPL)
              </code>
              <p>
                Your target is <strong>{state.amountText || "—"} leads</strong>. Where a CPL is a range, the budget is a
                range. &ldquo;AED 30 or less&rdquo; gives an upper limit only.
              </p>
            </>
          )}
        </div>
        <Assumptions pending={pending.length} />
      </>
    );
  }

  if (metric === "leads") {
    return (
      <>
        <div className={d.block}>
          <p className={d.big}>{plan.valid ? <LiveRange range={plan.leads} kind="leads" fallback="Not yet validated" /> : "—"}</p>
          <EvidencePill kind={isBudget ? (plan.usesAssumption ? "assumption" : "client") : "input"} />
        </div>
        <div className={d.block}>
          <h3>How it is calculated</h3>
          <code className={d.formula}>{isBudget ? "estimated leads = Σ (budget × share ÷ CPL)" : "lead target = the monthly target you entered"}</code>
          <p>
            Leads are raw enquiries, not qualified or working leads and not buyers.{" "}
            {isBudget
              ? "They are modelled from the regional CPL benchmarks, so they are a planning estimate, not a forecast result."
              : "In this mode the target is your input; the investment is the calculated value."}
          </p>
        </div>
        <div className={d.block}>
          <h3>By market</h3>
          <dl className={d.kv}>
            {rows.map((r) => (
              <Pair key={r.iso2} k={r.country.name} v={fmtLeadsRange(r.leads) ?? "Research pending"} />
            ))}
          </dl>
        </div>
        <Assumptions pending={pending.length} />
      </>
    );
  }

  if (metric === "sales") {
    const sales = eventualSales(plan.leads, effectiveCloseRate);
    return (
      <>
        <div className={d.block}>
          <p className={d.big}>
            {sales.lo === null ? "Not yet validated" : `≈ ${sales.hi !== null && Math.round(sales.hi * 10) !== Math.round(sales.lo * 10) ? `${(Math.round(sales.lo * 10) / 10).toFixed(1)}–${(Math.round(sales.hi * 10) / 10).toFixed(1)}` : (Math.round(sales.lo * 10) / 10).toFixed(1)}`}
          </p>
          <EvidencePill kind="assumption" label="Illustrative · not yet confirmed" />
        </div>
        <div className={d.block}>
          <h3>How it is calculated</h3>
          <code className={d.formula}>eventual sales = leads × the close rate of each market (about {fmtPct(effectiveCloseRate, 1)} for your mix)</code>
          <p>
            This is the number of sales the leads could produce <strong>eventually</strong>, not a monthly figure. The
            {" "}{fmtPct(state.closeRate, 1)} base rate comes from the original client discussion and is an editable planning
            assumption. Each market is scaled up or down from it by its buyer score, so strong buyer markets close more and weak ones less. This is a model, not a confirmed benchmark.
          </p>
        </div>
        <div className={d.block}>
          <h3>Assumptions and gaps</h3>
          <ul>
            <li>The close rate is illustrative and editable.</li>
            <li>The 19-case timing data has an unconfirmed denominator, so no first-sale date is promised.</li>
            <li>Meta 15%+ and Google 20%+ working-lead rates are not used as close rates.</li>
          </ul>
        </div>
      </>
    );
  }

  if (metric === "cpl") {
    return (
      <>
        <div className={d.block}>
          <p className={d.big}>{fmtCplRange(plan.blendedCpl) ?? "Not yet validated"}</p>
          <EvidencePill kind={plan.usesAssumption ? "assumption" : "client"} />
        </div>
        <div className={d.block}>
          <h3>How it is calculated</h3>
          <code className={d.formula}>blended CPL = spend in markets with a CPL ÷ their estimated leads</code>
          <p>
            It is weighted by your budget shares, so a larger share in a cheaper region lowers it. Markets without a
            CPL are left out, never counted as zero.
          </p>
        </div>
        <div className={d.block}>
          <h3>CPL by market</h3>
          <dl className={d.kv}>
            {rows.map((r) => (
              <Pair key={r.iso2} k={`${r.country.name} (${fmtPct(r.share)})`} v={r.cpl ? fmtCpl(r.cpl) : "Research pending"} />
            ))}
          </dl>
        </div>
        <Assumptions pending={pending.length} />
      </>
    );
  }

  return (
    <>
      <div className={d.block}>
        <p className={d.big}>{fmtPct(plan.coveredShare)} of budget</p>
        <p>
          {covered.length} of {rows.length} markets have a usable CPL. Only they contribute to the estimated leads.
        </p>
      </div>
      <div className={d.block}>
        <h3>Markets with a CPL</h3>
        <ul>{covered.map((r) => <li key={r.iso2}>{r.country.name}: {r.cpl ? fmtCpl(r.cpl) : ""}</li>)}</ul>
      </div>
      <div className={d.block}>
        <h3>Research pending</h3>
        {pending.length === 0 ? <p>None. Every selected market has a CPL reference.</p> : <ul>{pending.map((r) => <li key={r.iso2}>{r.country.name}</li>)}</ul>}
      </div>
    </>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

function Assumptions({ pending }: { pending: number }) {
  return (
    <div className={d.block}>
      <h3>Assumptions and gaps</h3>
      <ul>
        <li>Cost per lead comes from your own benchmarks. Countries without one use a low-confidence estimate.</li>
        {pending > 0 ? <li>{pending} selected market{pending === 1 ? " has" : "s have"} no CPL yet and add no estimated leads.</li> : null}
        <li>Month length: 30 days. Currency: AED.</li>
        <li>Lead-to-sale conversion is unconfirmed, so no sales are projected.</li>
      </ul>
    </div>
  );
}

/* ---------------- Channel ---------------- */

function ChannelDetail({ channel }: { channel: "meta" | "google" }) {
  const { state, dispatch, channel: spend } = usePlanner();
  const isMeta = channel === "meta";
  const share = isMeta ? state.metaShare : 1 - state.metaShare;
  const pct = Math.round(share * 100);
  const rate = isMeta ? CHANNEL_RATES.meta_percent_or_above : CHANNEL_RATES.google_percent_or_above;
  const name = isMeta ? "Meta" : "Google";

  return (
    <>
      <div className={d.block}>
        <p className={d.big}>
          <LiveRange range={isMeta ? spend.meta : spend.google} kind="aed" fallback="Set a budget" />
        </p>
        <p>
          {pct}% of the monthly media investment. <EvidencePill kind="assumption" />
        </p>
        <input
          type="range"
          className={ui.slider}
          min={0}
          max={100}
          step={1}
          value={isMeta ? pct : 100 - pct}
          aria-label="Meta Ads share of the budget; Google takes the rest"
          style={{ ["--track" as string]: `linear-gradient(90deg, var(--mp-blue) ${isMeta ? pct : 100 - pct}%, var(--mp-tint-2) ${isMeta ? pct : 100 - pct}%)` }}
          onChange={(e) => dispatch({ type: "setMeta", share: Number(e.target.value) / 100 })}
        />
        <p className={ui.subtle}>Moving this slider changes Meta; Google always takes the remainder so the total stays 100%.</p>
      </div>
      <div className={d.block}>
        <h3>How it is calculated</h3>
        <code className={d.formula}>{name} spend = total monthly investment × {pct}%</code>
        <p>If the total budget changes, the percentages stay fixed and the AED amounts follow.</p>
      </div>
      <div className={d.block}>
        <h3>What is known</h3>
        <ul>
          <li>
            Europe observed setup (client): about {fmtAed(EUROPE_PATTERN.meta_daily_aed)}/day per platform, roughly{" "}
            {fmtAed(EUROPE_PATTERN.meta_monthly_aed)}/month each over 30 days. An observation, not a minimum or a proven optimal split.
          </li>
          <li>Outside Europe, 50 / 50 is only a neutral starting default.</li>
        </ul>
      </div>
      <div className={d.block}>
        <h3>What is not estimated</h3>
        <ul>
          <li>{name} leads: the CPL benchmarks are blended regional figures, not {name}-specific CPLs.</li>
          <li>
            The client-reported {name} working-lead rate of {rate}%+ has no confirmed definition (raw-to-working
            lead or raw-to-sale), so it is not used.
          </li>
        </ul>
      </div>
    </>
  );
}
