// Module-customisation hooks so tests can import app code as written for the bundler:
//   - "@/..." alias to ./src
//   - extensionless relative imports resolve to .ts / .tsx / index.ts
//   - JSON imports without import attributes become a default-export module
// Test-only; production code is untouched.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const EXTS = [".ts", ".tsx", "/index.ts"];

function withExt(path) {
  if (/\.(ts|tsx|json|mjs|js)$/.test(path) && existsSync(path)) return path;
  for (const e of EXTS) if (existsSync(path + e)) return path + e;
  return null;
}

export async function resolve(specifier, context, next) {
  let target = null;
  if (specifier.startsWith("@/")) target = withExt(resolvePath(SRC, specifier.slice(2)));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    target = withExt(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
  }
  // The planner reads src/.../data/intel/*.json; tests use the clean fixtures instead of your edited data.
  const m = target && target.replace(/\\/g, "/").match(/\/src\/lib\/market-planning\/data\/intel\/([^/]+\.json)$/);
  if (m && !process.env.INTEL_LIVE) target = resolvePath(SRC, "..", "tests", "fixtures", "intel", "app", m[1]);
  if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".json") && url.startsWith("file:")) {
    const json = readFileSync(fileURLToPath(url), "utf8");
    return { format: "module", source: `export default ${json};`, shortCircuit: true };
  }
  return next(url, context);
}
