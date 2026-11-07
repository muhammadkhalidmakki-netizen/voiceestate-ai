// One command to refresh all market data and check it.
//   npm run intel          (or double-click update-market-data.cmd)
// Reads: docs/dubai-analysis/data/cpl-overrides.csv, benchmark-facts.json, market-scoring-config.json
// Writes: the generated CSV/JSON files, then validates them. Safe to run any time.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: "utf8" });

function python(args) {
  for (const exe of ["python", "py", "python3"]) {
    const r = run(exe, args);
    if (!r.error) return r;
  }
  return null;
}

console.log("Updating market data...");
const build = python(["-I", "scripts/market-intel/build_datasets.py"]);
if (!build) {
  console.error("\nPython was not found. Install Python 3 from python.org (tick 'Add to PATH') and run this again.");
  process.exit(1);
}
const lines = build.stdout.split(/\r?\n/);
for (const l of lines) if (/^OVERRIDE WARNING|^your edits kept|^CANNOT WRITE/.test(l)) console.log(l.startsWith("OVERRIDE") ? "  ! " + l.replace("OVERRIDE WARNING: ", "") : "  " + l);
if (build.status !== 0) {
  console.error("\nThe build failed:\n" + (build.stderr || build.stdout).split(/\r?\n/).slice(-12).join("\n"));
  process.exit(1);
}

const opp = run(process.execPath, ["scripts/market-intel/opportunity.mjs"]);
console.log((opp.stdout + opp.stderr).trim());
if (opp.status !== 0) process.exit(1);

const check = run(process.execPath, ["scripts/market-intel/validate.mjs"]);
const out = (check.stdout + check.stderr).trim();
console.log(out.split(/\r?\n/).filter((l) => !/^warning:/.test(l)).join("\n"));
if (check.status !== 0) process.exit(1);
console.log("\nDone. Refresh the dashboard to see the changes.");
