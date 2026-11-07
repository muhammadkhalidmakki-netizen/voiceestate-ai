// Watches the files you edit and refreshes the market data automatically when you save.
//   npm run intel:watch          (or double-click watch-market-data.cmd; press Ctrl+C to stop)
import { watch, existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const data = join(root, "docs", "dubai-analysis", "data");
const files = ["country-cpl-estimates.csv", "benchmark-facts.json", "market-scoring-config.json"];

const hash = (path) => {
  try {
    return createHash("sha1").update(readFileSync(path)).digest("hex");
  } catch {
    return "";
  }
};
const known = Object.fromEntries(files.map((f) => [f, hash(join(data, f))]));

let timer = null;
let running = false;
let again = false;

function update() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  console.log(`\n[${new Date().toLocaleTimeString()}] Change detected. Updating...`);
  const p = spawn(process.execPath, [join(root, "scripts", "market-intel", "update.mjs")], { cwd: root, stdio: "inherit" });
  p.on("close", () => {
    // The update rewrites some of these files itself; remember their new content so it does not trigger itself.
    for (const f of files) known[f] = hash(join(data, f));
    running = false;
    if (again) {
      again = false;
      update();
    }
  });
}

console.log("Watching for changes in:");
for (const f of files) {
  const path = join(data, f);
  if (!existsSync(path)) {
    console.log(`  (missing) ${f}`);
    continue;
  }
  console.log("  " + f);
  watch(path, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (hash(path) !== known[f]) update(); // ignore saves that did not change anything
    }, 800); // editors save in several steps; wait for them to finish
  });
}
console.log("\nEdit and save country-cpl-estimates.csv. Press Ctrl+C to stop.");
update();
