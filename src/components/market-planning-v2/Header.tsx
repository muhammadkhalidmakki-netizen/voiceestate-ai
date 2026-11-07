"use client";

import HistoryMenu from "./HistoryMenu";
import SavedPlansMenu from "./SavedPlansMenu";
import ShareButton from "./ShareButton";
import { Download, RotateCcw } from "lucide-react";
import { usePlanner } from "../market-planning/planner-context";
import { COUNTRY_BY_ISO, matureCpl } from "@/lib/market-planning/catalog";
import { cplSourceLabel, fmtAedRange, fmtCpl, fmtLeadsRange } from "@/lib/market-planning/format";
import { encodePlan, toCsv } from "@/lib/market-planning/plan-io";
import { eventualSales } from "@/lib/market-planning/sales";
import v from "./v2.module.css";

import { toStored } from "./plan-state-io";
export { stateFromUnknown, toStored } from "./plan-state-io";

export async function copyPlanLink(state: Parameters<typeof toStored>[0], notify: (m: string) => void) {
  const url = `${window.location.origin}${window.location.pathname}#plan=${encodePlan(toStored(state))}`;
  const done = () => notify("Link copied. Opening it needs the same sign-in.");
  try {
    await navigator.clipboard.writeText(url);
    done();
    return;
  } catch {
    /* fall through to the legacy copy path */
  }
  const ta = document.createElement("textarea");
  ta.value = url;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  if (ok) done();
  else notify("Copying is blocked in this browser. Use the address bar link after saving.");
};

export function Actions({ notify }: { notify: (m: string) => void }) {
  const { state, dispatch, plan, rows, pct, customized, effectiveCloseRate } = usePlanner();
  const exportCsv = () => {
    const sales = eventualSales(plan.leads, effectiveCloseRate);
    const lines: Array<Array<string | number | null>> = [
      ["Dubai Real Estate Market Planning: plan export"],
      ["Generated", new Date().toISOString()],
      ["Planning mode", state.mode === "budget" ? "Monthly budget" : "Lead target"],
      ["Monthly investment (AED)", fmtAedRange(plan.budget)],
      ["Estimated leads / month", fmtLeadsRange(plan.leads)],
      ["Meta share", `${Math.round(state.metaShare * 100)}%`],
      ["Close rate (illustrative, not yet confirmed)", `${Math.round(effectiveCloseRate * 1000) / 10}% (varies by market)`],
      ["Eventual sales (illustrative)", sales.lo === null ? "" : `${sales.lo.toFixed(1)}${sales.hi === null ? "+" : sales.hi.toFixed(1) === sales.lo.toFixed(1) ? "" : `-${sales.hi.toFixed(1)}`}`],
      [],
      ["Market", "Region", "Budget share %", "Investment (AED)", "CPL reference", "CPL source", "Estimated leads"],
      ...rows.map((r) => {
        const c = COUNTRY_BY_ISO.get(r.iso2);
        return [
          r.country.name,
          r.country.region,
          pct[r.iso2] ?? 0,
          fmtAedRange(r.spend),
          r.cpl ? fmtCpl(r.cpl) : "Research pending",
          r.cpl ? cplSourceLabel(r.cpl) : c && matureCpl(c) ? "" : "No client benchmark",
          fmtLeadsRange(r.leads) ?? "Not yet validated",
        ];
      }),
      [],
      ["Notes"],
      ["Cost per lead comes from your own benchmarks, or a low-confidence estimate where you have none. None is a measured country result."],
      ["The close rate is an illustrative assumption. Timing data (19 cases) has an unconfirmed denominator. No first-sale date is implied."],
    ];
    const blob = new Blob([toCsv(lines)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dubai-market-plan.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify("Plan exported as CSV");
  };

  return (
    <>
      <HistoryMenu />
      <SavedPlansMenu notify={notify} />
      <ShareButton notify={notify} />

      <button
        type="button"
        className={`${v.ghostBtn} ${customized ? v.ghostBtnAlert : ""}`}
        onClick={() => dispatch({ type: "restore" })}
        disabled={!customized}
        aria-label="Reset to the recommended plan"
        title="Reset to the recommended plan (English, AED 10,000, recommended markets)"
      >
        <RotateCcw size={15} aria-hidden="true" />
        <span className={v.btnText}>Reset</span>
      </button>
      <button type="button" className={v.ghostBtn} onClick={exportCsv} aria-label="Download the plan data as CSV" title="Download the plan data as a CSV file">
        <Download size={15} aria-hidden="true" />
        <span className={v.btnText}>CSV</span>
      </button>
    </>
  );
}
