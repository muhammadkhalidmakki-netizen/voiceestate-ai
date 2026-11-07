// Validates the market-intelligence datasets. Exit code 1 on any error.
//   node scripts/market-intel/validate.mjs
import { readFileSync } from "node:fs";
import { parseCsv } from "../../src/lib/market-planning/intel/csv.ts";
import { validateIntel } from "../../src/lib/market-planning/intel/validate.ts";

const dir = new URL("../../docs/dubai-analysis/data/", import.meta.url);
const csv = (f) => parseCsv(readFileSync(new URL(f, dir), "utf8"));
const facts = JSON.parse(readFileSync(new URL("benchmark-facts.json", dir), "utf8"));
const result = validateIntel({
  registry: csv("country-market-master.csv"),
  cpl: csv("country-cpl-estimates.csv"),
  signals: csv("country-market-signals.csv"),
  distribution: csv("country-language-distribution.csv"),
  diaspora: csv("diaspora-market-opportunities.csv"),
  languages: csv("language-master.csv"),
  sources: csv("research-source-register.csv"),
  adCost: csv("country-advertising-cost-signals.csv"),
  conditions: csv("country-investment-conditions.csv"),
  survey: csv("dubai-survey-evidence.csv"),
  motivations: csv("country-buyer-motivations.csv"),
  profile: csv("country-language-profile.csv"),
  clientBenchmarks: facts.regional_cpl_benchmarks,
  overrides: csv("country-cpl-estimates.csv").filter((r) => r.cpl_status === "user_override").map((r) => r.country_iso2),
});
for (const w of result.warnings) console.log("warning:", w);
for (const e of result.errors) console.error("error:", e);
console.log(result.errors.length === 0 ? "OK: datasets valid" : `${result.errors.length} error(s)`);
process.exit(result.errors.length === 0 ? 0 : 1);
