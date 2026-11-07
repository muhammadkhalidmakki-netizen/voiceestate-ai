// Prints what the dashboard's recommendation mode now picks for a few budgets (same code path as the planner).
//   node scripts/market-intel/dashboard-preview.mjs
import { register } from "node:module";
register("../../tests/helpers/app-loader.mjs", import.meta.url);
const ps = await import("../../src/components/market-planning/planner-state.ts");

for (const amount of [5000, 10000, 25000]) {
  const s = ps.reducer(ps.initialState(), { type: "setAmount", value: amount });
  const inputs = ps.marketInputs(s);
  const plan = ps.planFor(s).result;
  console.log(`\nAED ${amount}: ${inputs.length} markets | leads ${Math.round(plan.leads.lo)}-${plan.leads.hi === null ? "open" : Math.round(plan.leads.hi)}`);
  for (const m of inputs.sort((a, b) => b.share - a.share)) {
    const c = m.cpl;
    console.log(`  ${m.iso2}  ${(m.share * 100).toFixed(0).padStart(3)}%  CPL ${c.lo === null ? "<=" : c.lo.toFixed(0) + "-"}${c.hi.toFixed(0)}  ${c.source}`);
  }
}
