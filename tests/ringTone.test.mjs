import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startRingTone } from "../src/lib/ringTone.ts";

test("ring tone is safe without Web Audio (server / old browser): returns a no-op", () => {
  const tone = startRingTone();
  assert.doesNotThrow(() => {
    tone.stop();
    tone.stop();
  });
});

test("wiring: the tone plays only while connecting and is stopped on cleanup", () => {
  const vc = readFileSync(new URL("../src/components/VoiceControls.tsx", import.meta.url), "utf8");
  assert.match(
    vc,
    /if \(status !== "connecting"\) return;\s*const tone = startRingTone\(\);\s*return \(\) => tone\.stop\(\);\s*\}, \[status\]\);/,
  );
});
