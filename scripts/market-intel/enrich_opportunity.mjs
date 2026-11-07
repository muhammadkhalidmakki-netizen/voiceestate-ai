// Fills BLANK cells in country-opportunity-scores.csv with researched / modelled estimates. Never touches a cell that has a value.
//   node scripts/market-intel/enrich_opportunity.mjs
// Sources: World Bank (stock market capitalisation % GDP, outward FDI, inflation, exchange-rate change in countries.json),
// and reported Dubai buyer nationalities (brokerage analyses of Dubai Land Department data, 2024-2025; NOT official DLD figures).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSV = resolve(root, "docs/dubai-analysis/data/country-opportunity-scores.csv");
const countries = JSON.parse(readFileSync(resolve(root, "src/lib/market-planning/data/intel/countries.json"), "utf8"));
const wb = (f) => { const m = {}; for (const r of JSON.parse(readFileSync(resolve(root, `scripts/market-intel/raw/${f}.json`), "utf8"))[1]) if (r.value !== null) m[r.countryiso3code] = r.value; return m; };
const iso3 = {}; for (const r of JSON.parse(readFileSync(resolve(root, "scripts/market-intel/raw/wb_countries.json"), "utf8"))[1]) iso3[r.iso2Code] = r.id;
const mcap = wb("wb_mktcap_gdp"), remit = wb("wb_remit");
const clamp = (x) => Math.max(0, Math.min(100, x));
const avg = (a) => { const v = a.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)); return v.length >= 2 ? v.reduce((s, x) => s + x, 0) / v.length : null; };

// Reported share of Dubai property buyers by nationality, % (brokerage analyses of DLD data, 2024-2025). Approximate.
const REPORTED = { IN: 22, GB: 17, CN: 14, SA: 11, RU: 9, PK: 10, EG: 6, CA: 5, IT: 4, LB: 4 };
const AFFINITY = { Asia: 1.0, Europe: 0.9, Africa: 0.8, Americas: 0.8, Oceania: 0.8 };

const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
function parse(text) {
  const rows = []; let cur = []; let f = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { cur.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; cur.push(f); f = ""; rows.push(cur); cur = []; }
    else f += ch;
  }
  return rows.filter((r) => r.some((x) => x !== ""));
}
const rows = parse(readFileSync(CSV, "utf8"));
const head = rows[0];
const ix = (n) => head.indexOf(n);
const D = ix("dubai_demand"), F = ix("financial_capacity"), M = ix("investment_motivations"), A = ix("addressable_audience"), N = ix("notes");
let nM = 0, nD = 0;
for (const r of rows.slice(1)) {
  const iso2 = r[0]; const c = countries[iso2];
  if (!c) continue;
  const notes = [];
  if (r[M] === "") {
    const cap = mcap[iso3[iso2]];
    const score = avg([
      cap === undefined ? null : clamp((cap / 300) * 100) * 0.5, // deep stock market: investing culture (half weight: rich markets already invest at home)
      c.inf === null || c.inf === undefined ? null : clamp((c.inf / 25) * 100), // inflation: wants hard assets
      c.fx === null || c.fx === undefined ? null : clamp((-c.fx / 0.3) * 100), // currency weakening: wants to diversify
      c.ofdi === null || c.ofdi === undefined ? null : clamp((c.ofdi / 8) * 100), // already invests abroad
      remit[iso3[iso2]] === undefined ? null : clamp((remit[iso3[iso2]] / 10) * 100), // large diaspora ties
    ]);
    if (score !== null) { r[M] = String(Math.max(40, Math.round(score))); notes.push("motivations estimated: stock market size (half weight), inflation, currency change, outward investment, remittances (never below neutral)"); nM++; }
  }
  if (r[D] === "") {
    let score = null;
    if (REPORTED[iso2] !== undefined) { score = Math.sqrt(REPORTED[iso2] / 22) * 100; notes.push(`demand from reported Dubai buyer share ~${REPORTED[iso2]}% (broker analyses of DLD data)`); }
    // No modelled demand: a country without Dubai demand evidence stays blank (unknown), never a made-up low number.
    if (score !== null) { r[D] = String(Math.round(score)); nD++; }
  }
  if (notes.length) r[N] = [r[N], ...notes].filter(Boolean).join("; ");
}
writeFileSync(CSV, rows.map((r) => r.map(q).join(",")).join("\n") + "\n");
console.log(`Filled ${nM} motivation and ${nD} demand estimates (blank cells only).`);
