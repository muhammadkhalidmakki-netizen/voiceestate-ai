// Guards against production identifiers / credentials leaking into anything
// that gets committed or shipped to browsers.
//
// The real production values live only in the git-ignored project-context/
// folder. This test READS them from there at run time, so this file never
// contains a real secret. If project-context/ is absent (e.g. CI), the
// value-based checks are skipped and only the generic pattern checks run.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const p = (...parts) => join(ROOT, ...parts);

// ---- helpers ----
function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, exts, out);
    else if (exts.includes(extname(name))) out.push(full);
  }
  return out;
}

const gitIgnored = (path) => {
  try {
    execFileSync("git", ["check-ignore", "-q", path], { cwd: ROOT, stdio: "ignore" });
    return true; // exit 0 => ignored
  } catch (e) {
    if (e && e.status === 1) return false; // exit 1 => not ignored
    return null; // git unavailable / not a repo
  }
};

// Values that must never appear outside project-context/, read from it at runtime.
function productionTokens() {
  const dir = p("project-context");
  if (!existsSync(dir)) return null;
  const text = readdirSync(dir)
    .filter((f) => /\.(md|txt|json)$/i.test(f))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
  const found = new Set();
  const grab = (re, group = 0) => {
    for (const m of text.matchAll(re)) found.add(m[group]);
  };
  grab(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g); // Vapi/UUID ids
  grab(/\bAC[0-9a-f]{32}\b/g); // Twilio account SID
  grab(/\bHX[0-9a-f]{32}\b/g); // Twilio content SIDs
  grab(/bitrix24\.\w+\/rest\/\d+\/([a-z0-9]{10,})/gi, 1); // Bitrix webhook secret
  return [...found];
}

// Generic shapes of credentials, independent of project-context/.
const GENERIC_PATTERNS = [
  ["Bitrix webhook URL", /bitrix24\.\w+\/rest\/\d+\/[a-z0-9]{10,}/i],
  ["Twilio account SID", /\bAC[0-9a-f]{32}\b/],
  ["Twilio content SID", /\bHX[0-9a-f]{32}\b/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["OpenAI-style secret key", /\bsk-[A-Za-z0-9_-]{20,}/],
];

const SHIPPED_DIRS = ["src", "public"];
const SHIPPED_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json", ".md", ".txt", ".svg", ".html"];
const shippedFiles = () => SHIPPED_DIRS.flatMap((d) => walk(p(d), SHIPPED_EXTS));

// ---- tests ----
test("project-context/ (production IDs and tokens) can never be committed", () => {
  const ignored = gitIgnored("project-context/anything.md");
  if (ignored === null) return; // no git here
  assert.equal(ignored, true, "project-context/ must be listed in .gitignore");
});

test(".env files stay private, but .env.example is committable", () => {
  const local = gitIgnored(".env.local");
  const example = gitIgnored(".env.example");
  if (local === null) return;
  assert.equal(local, true, ".env.local must be git-ignored");
  assert.equal(example, false, ".env.example must NOT be git-ignored");
});

test(".env.example lists variable NAMES only (no values)", () => {
  const lines = readFileSync(p(".env.example"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"));
  assert.ok(lines.length > 0);
  for (const line of lines) {
    assert.match(line, /^[A-Z][A-Z0-9_]*=$/, "must be NAME= with an empty value");
  }
  // only the public, browser-safe demo variables are allowed
  const names = lines.map((l) => l.slice(0, -1)).sort();
  assert.deepEqual(names, ["NEXT_PUBLIC_VAPI_ASSISTANT_ID", "NEXT_PUBLIC_VAPI_PUBLIC_KEY"]);
});

test("no NEXT_PUBLIC variable is named like a secret", () => {
  const files = [...shippedFiles(), p(".env.example")];
  const risky = /NEXT_PUBLIC_\w*(SECRET|PRIVATE|TOKEN|PASSWORD|API_KEY|SERVICE_KEY)\w*/i;
  for (const f of files) {
    assert.doesNotMatch(readFileSync(f, "utf8"), risky, `${relative(ROOT, f)} exposes a secret-looking public variable`);
  }
});

test("shipped source has no credential-shaped strings", () => {
  for (const f of shippedFiles()) {
    const text = readFileSync(f, "utf8");
    for (const [name, re] of GENERIC_PATTERNS) {
      assert.doesNotMatch(text, re, `${name} found in ${relative(ROOT, f)}`);
    }
  }
});

test("shipped source contains none of the production identifiers", () => {
  const tokens = productionTokens();
  if (!tokens) return; // project-context/ not present: nothing to compare against
  assert.ok(tokens.length > 0, "expected to find production identifiers to guard");
  for (const f of shippedFiles()) {
    const text = readFileSync(f, "utf8");
    for (const t of tokens) {
      // report the file, never the value
      assert.ok(!text.includes(t), `a production identifier appears in ${relative(ROOT, f)}`);
    }
  }
});

test("the demo .env.local does not use the production assistant or any prod ID", () => {
  const tokens = productionTokens();
  const envPath = p(".env.local");
  if (!tokens || !existsSync(envPath)) return;
  const env = readFileSync(envPath, "utf8");
  for (const t of tokens) {
    assert.ok(!env.includes(t), ".env.local contains a production identifier");
  }
  // and it must only carry the two public demo variables
  const names = env.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).map((l) => l.split("=")[0].trim());
  for (const n of names) {
    assert.match(n, /^NEXT_PUBLIC_VAPI_(PUBLIC_KEY|ASSISTANT_ID)$/, `unexpected variable in .env.local: ${n}`);
  }
});

test("built browser bundle (if present) has no production identifiers", () => {
  const tokens = productionTokens();
  const dir = p(".next", "static");
  if (!tokens || !existsSync(dir)) return;
  for (const f of walk(dir, [".js"])) {
    const text = readFileSync(f, "utf8");
    for (const t of tokens) {
      assert.ok(!text.includes(t), `a production identifier appears in built file ${relative(ROOT, f)}`);
    }
    for (const [name, re] of GENERIC_PATTERNS) {
      assert.doesNotMatch(text, re, `${name} in built file ${relative(ROOT, f)}`);
    }
  }
});
