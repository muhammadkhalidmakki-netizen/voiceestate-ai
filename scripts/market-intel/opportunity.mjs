// Country opportunity scores: ONE sheet, one row per country, six dimension scores (0-100) + your weights + client results.
//   node scripts/market-intel/opportunity.mjs
// First run creates docs/dubai-analysis/data/country-opportunity-scores.csv from the data we already hold.
// After that the CSV is YOURS: edit any score, the weights row, or client_boost, then run this (or npm run intel).
// It never overwrites your edits. Delete the CSV (or pass --regenerate) to rebuild from scratch.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CSV = resolve(root, "docs/dubai-analysis/data/country-opportunity-scores.csv");
const OUT = resolve(root, "src/lib/market-planning/data/intel/opportunity.json");
const countries = JSON.parse(readFileSync(resolve(root, "src/lib/market-planning/data/intel/countries.json"), "utf8"));
const DIMS = ["dubai_demand", "financial_capacity", "investment_motivations", "cross_border_readiness", "addressable_audience", "acquisition_economics"];
const WEIGHTS = [25, 20, 15, 10, 10, 20];
const clamp = (x) => Math.max(0, Math.min(100, x));
const avg = (a) => { const v = a.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const logScale = (n, lo, hi) => (n === null || n === undefined ? null : n <= 1 ? 0 : clamp(((Math.log10(n) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * 100));
const maxDx = Math.max(...Object.values(countries).map((c) => c.dx ?? 0));

function generate(c) {
  const demand = c.dx === null ? null : Math.sqrt(c.dx / maxDx) * 100;
  const aff = logScale(c.aff, 1e3, 1e7);
  const capacity = avg([c.pp, aff, c.ic]);
  const motivations = c.mot === null || c.mot === undefined ? null : (c.mot / 3) * 100;
  const ps = c.ps === null || c.ps === undefined ? null : clamp(((c.ps + 2.5) / 5) * 100);
  const readiness = avg([c.ci, ps]);
  const audience = avg([aff, c.net]);
  const mid = c.ch === null || c.ch === undefined ? null : c.cl !== null && c.cl !== undefined ? (c.cl + c.ch) / 2 : c.ch;
  const economics = mid === null ? null : clamp(100 - ((mid - 20) / 100) * 100);
  return [demand, capacity, motivations, readiness, audience, economics].map((x) => (x === null ? "" : String(Math.round(x))));
}

const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
if (!existsSync(CSV) || process.argv.includes("--regenerate")) {
  const head = ["iso2", "country", ...DIMS, "client_boost", "notes"];
  const lines = [head.join(","), ["_WEIGHTS", "Weights (percent, edit here)", ...WEIGHTS, "", "Dimension weights. Should add up to 100."].map(q).join(",")];
  for (const [iso2, c] of Object.entries(countries).sort((a, b) => a[1].n.localeCompare(b[1].n))) lines.push([iso2, c.n, ...generate(c), "", ""].map(q).join(","));
  writeFileSync(CSV, lines.join("\n") + "\n");
  console.log("Created", CSV);
}

function parse(text) {
  const rows = []; let cur = []; let f = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ",") { cur.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; cur.push(f); f = ""; if (cur.some((x) => x !== "")) rows.push(cur); cur = []; }
    else f += ch;
  }
  if (f || cur.length) { cur.push(f); rows.push(cur); }
  return rows;
}
const [head, ...body] = parse(readFileSync(CSV, "utf8"));
const col = (r, name) => r[head.indexOf(name)] ?? "";
const num = (s) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));
const wRow = body.find((r) => r[0] === "_WEIGHTS");
const weights = DIMS.map((d, i) => num(col(wRow ?? [], d)) ?? WEIGHTS[i]);
const sum = weights.reduce((a, b) => a + b, 0);
if (Math.abs(sum - 100) > 0.5) console.warn(`Warning: weights add up to ${sum}, not 100. They are normalised.`);
const scores = {};
for (const r of body) {
  if (r[0] === "_WEIGHTS" || !countries[r[0]]) continue;
  scores[r[0]] = { s: DIMS.map((d) => { const v = num(col(r, d)); return v === null ? null : clamp(v); }), b: Math.max(0, Math.min(15, num(col(r, "client_boost")) ?? 0)) };
}
writeFileSync(OUT, JSON.stringify({ dims: DIMS, weights: weights.map((w) => w / sum), scores }));
console.log(`Opportunity scores: ${Object.keys(scores).length} countries, weights ${weights.join("/")} -> ${OUT}`);
