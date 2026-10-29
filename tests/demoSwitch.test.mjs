import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("the master switch is one boolean line the on/off script can rewrite", () => {
  assert.match(read("../src/lib/demoSwitch.ts"), /^export const DEMO_ENABLED = (true|false);$/m);
  const pkg = JSON.parse(read("../package.json"));
  for (const s of ["demo:on", "demo:off", "demo:status"]) assert.ok(pkg.scripts[s], s);
});

test("wiring: when the switch is off, no Vapi client and no calls", () => {
  const vapi = read("../src/lib/vapi.ts");
  assert.match(vapi, /return DEMO_ENABLED && Boolean\(publicKey && assistantId\);/);
  assert.match(vapi, /if \(!DEMO_ENABLED\) \{\s*throw new Error/);
  const vc = read("../src/components/VoiceControls.tsx");
  assert.match(vc, /const configured = isVapiConfigured\(\);/); // call button + client both hang off this
  assert.match(vc, /temporarily unavailable/);
});
