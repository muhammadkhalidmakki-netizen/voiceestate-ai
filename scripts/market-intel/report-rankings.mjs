// Prints buyer-potential and acquisition-efficiency rankings and a country comparison from the engine.
//   node scripts/market-intel/report-rankings.mjs [ISO2 ISO2 ...]
import { readFileSync } from "node:fs";
import { buildCandidates, buyerScore, efficiencyScore, resolveCpl, minTestBudget } from "../../src/lib/market-planning/intel/recommend.ts";

const d = (f) => JSON.parse(readFileSync(new URL(`../../src/lib/market-planning/data/intel/${f}`, import.meta.url), "utf8"));
const data = { countries: d("countries.json"), languageShare: d("language-share.json"), diaspora: d("diaspora.json"), config: d("scoring-config.json") };
const langs = { en: "professional" };
const f1 = (x) => (x === null || x === undefined ? "  -" : x.toFixed(0).padStart(3));
const rows = [];
for (const iso of Object.keys(data.countries)) {
  const c = data.countries[iso];
  const b = buyerScore(iso, langs, data);
  const cpl = resolveCpl(c);
  const eff = efficiencyScore(iso, cpl, cpl ? minTestBudget(cpl, data.config) : null, b.language, data);
  rows.push({ iso, n: c.n, buyer: b.score, ev: b.evidence, eff: eff.score, cpl: cpl ? cpl.base ?? cpl.hi : null, src: c.cs, dx: c.dx, ad: c.ad, b });
}
const show = (title, list) => {
  console.log(`\n${title}`);
  for (const r of list) console.log(`  ${r.iso} ${r.n.padEnd(22)} buyer ${f1(r.buyer)} ev ${r.ev.toFixed(2)} eff ${f1(r.eff)} cpl ${r.cpl ?? "n/a"} ${r.src} demand ${r.dx ?? "-"}`);
};
const eligible = rows.filter((r) => r.buyer !== null && !r.ad);
show("Strongest buyer potential (English agents; score is relative, not a probability)", [...eligible].sort((a, b) => b.buyer - a.buyer).slice(0, 15));
const ranked = buildCandidates(langs, data).candidates.slice(0, 12);
console.log("\nBest evidence-adjusted ranking (what the engine selects first)");
for (const c of ranked) console.log(`  ${c.iso2} ${data.countries[c.iso2].n.padEnd(22)} rank ${c.rank.toFixed(1)} buyer ${f1(c.buyer.score)} ev ${c.buyer.evidence.toFixed(2)} eff ${f1(c.efficiency.score)} cpl ${c.cpl.base ?? c.cpl.hi} ${c.cpl.source}`);
show("Attractive but expensive (buyer >= 60, CPL base >= 60)", eligible.filter((r) => r.buyer >= 60 && r.cpl >= 60).sort((a, b) => b.buyer - a.buyer).slice(0, 12));
show("Affordable but weaker buyer evidence (CPL base <= 35, buyer < 60 or evidence < 0.45)", eligible.filter((r) => r.cpl !== null && r.cpl <= 35 && (r.buyer < 60 || r.ev < 0.45)).sort((a, b) => b.eff - a.eff).slice(0, 12));
const cmp = process.argv.slice(2).length ? process.argv.slice(2) : ["GB", "SD"];
console.log("\nCountry comparison");
for (const iso of cmp) {
  const r = rows.find((x) => x.iso === iso);
  const c = data.countries[iso];
  console.log(`  ${iso} ${c.n}: buyer ${f1(r.buyer)} (evidence ${r.ev.toFixed(2)}), efficiency ${f1(r.eff)}, CPL ${r.cpl ?? "n/a"} ${r.src}`);
  console.log(`     GDP/cap PPP ${c.gdp ? Math.round(c.gdp) : "-"} | purchasing-power pct ${c.pp ?? "-"} | modelled affluent pop ${c.aff ? Math.round(c.aff).toLocaleString() : "-"} | investment capability ${c.ic ?? "-"} | conditions ${c.ci ?? "-"} | growth ${c.gr?.toFixed(1) ?? "-"}% | inflation ${c.inf?.toFixed(1) ?? "-"}% | stability ${c.ps?.toFixed(2) ?? "-"} | Dubai search share ${c.dx ?? "none on file"}`);
  console.log("     factors:", Object.entries(r.b.factors).map(([k, v]) => `${k}=${v.score === null ? "n/a" : (v.score * 100).toFixed(0)}`).join(" "));
}
