"use client";

import { Chevron } from "../ui";
import { usePlanner } from "../planner-context";
import {
  fmtAedRange,
  fmtCpl,
  fmtCplRange,
  fmtLeadsRange,
  fmtOne,
  fmtPct,
} from "@/lib/market-planning/format";
import ui from "../ui.module.css";
import f from "./forecast.module.css";

export default function Explainer() {
  const { plan, rows, state, channel } = usePlanner();
  const covered = rows.filter((r) => r.cpl && r.share > 0);
  const pending = rows.filter((r) => !r.cpl);
  const shown = covered.slice(0, 5);
  const isBudget = plan.mode === "budget";

  return (
    <details className={ui.disclosure} id="explain">
      <summary className={ui.disclosureSummary}>
        How this estimate is calculated
        <Chevron className={ui.chevron} />
      </summary>
      <div className={`${ui.disclosureBody} ${f.explain}`}>
        <div>
          <h4>1. Your input</h4>
          <p>
            {isBudget
              ? `You set a monthly media budget (advertising spend only: no agency fees, creative production or taxes). Your budget is ${fmtAedRange(plan.budget) ?? "not yet valid"}.`
              : `You set a monthly lead target of raw enquiries. The investment is calculated from it: ${fmtAedRange(plan.budget) ?? "not yet available"}.`}
          </p>
        </div>

        <div>
          <h4>2. Budget by market</h4>
          <p>
            Each market holds a share of the budget. Your {rows.length} market{rows.length === 1 ? "" : "s"} are
            weighted as an editable planning distribution (equal by default), and the shares always total 100%.
          </p>
          <code className={f.formula}>spend(market) = budget × share</code>
        </div>

        <div>
          <h4>3. Leads from CPL</h4>
          <code className={f.formula}>estimated leads(market) = spend(market) ÷ CPL(market)</code>
          {plan.valid && shown.length > 0 ? (
            <ul>
              {shown.map((r) => (
                <li key={r.iso2}>
                  {r.country.name}: {fmtAedRange(r.spend)} ÷ {r.cpl ? fmtCpl(r.cpl) : "—"} ={" "}
                  {fmtLeadsRange(r.leads) ?? "open-ended"} leads
                </li>
              ))}
              {covered.length > shown.length ? <li>…and {covered.length - shown.length} more markets.</li> : null}
            </ul>
          ) : null}
          <p>
            CPL ranges produce a range of leads (a higher CPL gives fewer leads). &ldquo;AED 30 or less&rdquo; gives
            a minimum number of leads only, because no lower CPL bound was supplied.
          </p>
        </div>

        <div>
          <h4>4. Blended CPL and lead targets</h4>
          <code className={f.formula}>
            blended CPL = covered spend ÷ estimated leads{"\n"}required budget = target leads × blended CPL ÷ covered share
          </code>
          <p>
            Blended CPL now: {fmtCplRange(plan.blendedCpl) ?? "not yet available"}. Switching between budget and
            lead-target mode uses this same relationship, so the two modes always agree.
          </p>
        </div>

        <div>
          <h4>5. Meta and Google</h4>
          <code className={f.formula}>
            Meta = budget × {fmtPct(state.metaShare)} · Google = budget × {fmtPct(1 - state.metaShare)}
          </code>
          <p>
            Meta {fmtAedRange(channel.meta) ?? "—"}, Google {fmtAedRange(channel.google) ?? "—"}. Platform lead
            counts are not calculated because the benchmarks are blended regional CPLs.
          </p>
        </div>

        <div>
          <h4>What is missing or unconfirmed</h4>
          <ul>
            {pending.length > 0 ? (
              <li>
                CPL research pending for {pending.map((r) => r.country.name).join(", ")}. Their spend is shown but
                they add no estimated leads ({fmtOne((1 - plan.coveredShare) * 100)}% of the budget).
              </li>
            ) : null}
            {plan.usesAssumption ? <li>Some CPLs are your own planning assumptions, not client benchmarks.</li> : null}
            <li>Learning-phase CPL is supplied for Europe only (AED 120 vs AED 50 mature).</li>
            <li>Meta 15%+ and Google 20%+ working-lead rates: meaning unconfirmed, not used.</li>
            <li>Lead-to-sale conversion: not confirmed, so no sales counts are projected.</li>
            <li>
              Regional CPLs are client-provided proxies, not measured country results.
            </li>
          </ul>
        </div>
      </div>
    </details>
  );
}
