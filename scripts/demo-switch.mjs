// Usage: node scripts/demo-switch.mjs on|off|status
// Rewrites the single DEMO_ENABLED line in src/lib/demoSwitch.ts.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../src/lib/demoSwitch.ts", import.meta.url);
const src = readFileSync(file, "utf8");
const re = /export const DEMO_ENABLED = (true|false);/;
const current = re.exec(src)?.[1];
if (!current) {
  console.error("Could not find the DEMO_ENABLED line in src/lib/demoSwitch.ts");
  process.exit(1);
}

const arg = process.argv[2];
if (arg === "status" || !arg) {
  console.log(`Demo calling is ${current === "true" ? "ON" : "OFF"}.`);
} else if (arg === "on" || arg === "off") {
  const next = arg === "on" ? "true" : "false";
  writeFileSync(file, src.replace(re, `export const DEMO_ENABLED = ${next};`));
  console.log(`Demo calling is now ${arg.toUpperCase()}. Commit and push to deploy it.`);
} else {
  console.error("Usage: node scripts/demo-switch.mjs on|off|status");
  process.exit(1);
}
