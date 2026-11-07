// Compares the algorithm's pick with hand-built portfolios for one budget, through the dashboard's own forecast
// and first-sale timing (illustrative: one global 1.5% close rate and the provisional 19-case timing curve).
//   node scripts/market-intel/scenario-compare.mjs [budget]
import { register } from "node:module";
import { readFileSync } from "node:fs";
register("../../tests/helpers/app-loader.mjs", import.meta.url);
const ps = await import("../../src/components/market-planning/planner-state.ts");
const sales = await import("../../src/lib/market-planning/sales.ts");
const facts = JSON.parse(readFileSync(new URL("../../docs/dubai-analysis/data/benchmark-facts.json", import.meta.url), "utf8"));
const cs = facts.sales_cycle_observations;

const budget = Number(process.argv[2] ?? 5000);
const base = ps.reducer(ps.initialState(), { type: "setAmount", value: budget });
const show = (label, s) => {
  const r = ps.planFor(s).result;
  const ev = sales.eventualSales(r.leads, s.closeRate);
  const steps = sales.batchSaleDays(ev.lo, cs.checkpoints, cs.long_tail, 3);
  const first = steps[0].days;
  console.log(`${label.padEnd(28)} leads ${Math.round(r.leads.lo)}${r.leads.hi === null ? "+" : "-" + Math.round(r.leads.hi)}  sales ${ev.lo.toFixed(1)}${ev.hi === null ? "+" : "-" + ev.hi.toFixed(1)}  first sale ~${first === null ? "n/a" : first + " days"}`);
};
console.log(`AED ${budget} (model outputs, illustrative)`);
show(`Algorithm: ${Object.keys(base.shares).join("+")}`, base);
for (const pair of [["GB", "US"], ["GB", "IN"], ["US", "IN"]]) {
  const shares = Object.fromEntries(pair.map((k) => [k, 0.5]));
  show(`Hand-picked: ${pair.join("+")}`, { ...base, selection: "custom", shares });
}
