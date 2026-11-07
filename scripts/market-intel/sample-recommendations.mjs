// Prints model-output samples for the dynamic recommendation engine.
//   node scripts/market-intel/sample-recommendations.mjs [budget|leads] [amount] [lang,lang]
import { readFileSync } from "node:fs";
import { recommend } from "../../src/lib/market-planning/intel/recommend.ts";

const d = (f) => JSON.parse(readFileSync(new URL(`../../src/lib/market-planning/data/intel/${f}`, import.meta.url), "utf8"));
const data = { countries: d("countries.json"), languageShare: d("language-share.json"), diaspora: d("diaspora.json"), config: d("scoring-config.json") };

const fmt = (r) => (r.lo === null ? "?" : r.lo.toFixed(0)) + "-" + (r.hi === null ? "open" : r.hi.toFixed(0));
function show(label, input) {
  const r = recommend(input, data);
  console.log(`\n== ${label} | ${r.mode} ${input.amount} | langs ${Object.keys(r.languages).join("+")}${r.languagesDefaulted ? " (default)" : ""}`);
  console.log(`   budget AED ${Math.round(r.budget)} | leads ${fmt(r.totals.leads)} | illustrative sales ${r.totals.eventualSales.lo?.toFixed(1)}-${r.totals.eventualSales.hi === null ? "open" : r.totals.eventualSales.hi.toFixed(1)} @${r.closeRate * 100}%`);
  for (const m of r.markets) {
    console.log(`   ${m.iso2} ${m.name.padEnd(16)} ${(m.share * 100).toFixed(0).padStart(3)}%  AED ${Math.round(m.spend).toString().padStart(6)}  cpl ${m.cpl.lo ?? "<="}-${m.cpl.hi} ${m.cpl.source.slice(0, 6)}  buyer ${m.buyer.score.toFixed(0)} q ${(m.quality*100).toFixed(0)} eff ${m.efficiency.score === null ? '-' : m.efficiency.score.toFixed(0)}  sales~${(m.salesContribution * 100).toFixed(0)}%  ${m.evidenceLevel}`);
  }
}

const [mode, amount, langs] = process.argv.slice(2);
if (mode) {
  const languages = Object.fromEntries((langs ?? "").split(",").filter(Boolean).map((c) => [c, "professional"]));
  show("custom", { mode, amount: Number(amount), languages });
} else {
  const sets = {
    "English only": {},
    "English + Arabic": { en: "professional", ar: "professional" },
    "English + French": { en: "professional", fr: "professional" },
    "Arabic only": { ar: "professional" },
  };
  for (const budget of [5000, 10000, 25000]) for (const [name, languages] of Object.entries(sets)) show(name, { mode: "budget", amount: budget, languages });
}
