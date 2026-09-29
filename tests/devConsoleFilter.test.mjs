import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isKnownNormalEndLog,
  KNOWN_NORMAL_END_LOG,
} from "../src/lib/devConsoleFilter.ts";

test("matches exactly the known normal end-of-call Daily message", () => {
  assert.equal(isKnownNormalEndLog([KNOWN_NORMAL_END_LOG]), true);
  // Daily's logger leaves a trailing space in the real output
  assert.equal(isKnownNormalEndLog(["Meeting ended due to ejection: Meeting has ended "]), true);
  assert.equal(isKnownNormalEndLog(["Meeting ended due to ejection:", "Meeting has ended"]), true);
});

test("does NOT match anything else (real failures must still surface)", () => {
  const others = [
    ["Meeting ended in error: Meeting has ended"], // the non-ejection variant
    ["Meeting ended due to ejection: Removed by admin"], // a different reason
    ["Meeting ended due to ejection: Meeting has ended and more"],
    ["Prefix: Meeting ended due to ejection: Meeting has ended"],
    ["Vapi error", { type: "daily-call-join-error" }],
    [new Error("Meeting ended due to ejection: Meeting has ended")],
    ["Meeting ended due to ejection: Meeting has ended", { extra: 1 }],
    ["camera or mic permission denied"],
    [],
  ];
  for (const args of others) {
    assert.equal(isKnownNormalEndLog(args), false, JSON.stringify(args));
  }
});

test("wiring: filter is dev-only and passes everything else through", () => {
  const src = readFileSync(
    new URL("../src/components/DevConsoleFilter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /NODE_ENV === "production"\) return;/);
  assert.match(src, /previous\.apply\(console, args\)/);
  assert.match(src, /if \(console\.error === filtered\) console\.error = previous;/);

  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<DevConsoleFilter \/>/);
});
