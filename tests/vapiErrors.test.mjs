import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyVapiError } from "../src/lib/vapiErrors.ts";

// Payloads copied from the real console output of successful calls.
const dailyEjected = {
  type: "daily-error",
  timestamp: "2026-09-29T19:04:41.705Z",
  error: {
    action: "error",
    error: { details: undefined, msg: "Meeting has ended", type: "ejected" },
    errorMsg: "Meeting has ended",
    message: { details: undefined, msg: "Meeting has ended", type: "ejected" },
  },
};
const dailyNoRoom = {
  type: "daily-error",
  error: {
    action: "error",
    error: { msg: "Exiting meeting because room was deleted", type: "no-room" },
    errorMsg: "Meeting has ended",
    message: { msg: "Exiting meeting because room was deleted", type: "no-room" },
  },
};

test("call-ending Daily events are normal termination", () => {
  assert.equal(classifyVapiError(dailyEjected), "call-ended");
  assert.equal(classifyVapiError(dailyNoRoom), "call-ended");
});

test("call-ending is recognised by message alone, too", () => {
  const onlyMsg = { type: "daily-error", error: { errorMsg: "Meeting has ended" } };
  assert.equal(classifyVapiError(onlyMsg), "call-ended");
  const onlyRoom = {
    type: "daily-error",
    error: { msg: "Exiting meeting because room was deleted" },
  };
  assert.equal(classifyVapiError(onlyRoom), "call-ended");
});

test("non-critical SDK errors do not affect the call", () => {
  for (const type of [
    "audio-processing-setup-error",
    "audio-processor-recovery-error",
    "audio-observer-setup-error",
    "video-recording-setup-error",
  ]) {
    assert.equal(
      classifyVapiError({ type, stage: type, error: { message: "KrispInitError: Canceled" } }),
      "non-critical",
      type,
    );
  }
});

test("genuine failures stay fatal", () => {
  const fatal = [
    { type: "daily-call-join-error", error: { message: "join failed" } },
    { type: "daily-call-object-creation-error", error: { message: "boom" } },
    { type: "start-method-error", error: { message: "bad key" } },
    { type: "validation-error", error: { message: "Assistant must be provided" } },
    { type: "reconnect-error", error: {} },
    // a Daily error that is NOT about the meeting being over
    { type: "daily-error", error: { errorMsg: "Camera or mic permission denied" } },
    { type: "daily-error", error: { error: { type: "connection-error", msg: "lost" } } },
    // the end-of-call wording is only trusted on Daily's own error event
    { type: "start-method-error", error: { message: "Meeting has ended" } },
    "unexpected string",
    null,
    undefined,
  ];
  for (const p of fatal) assert.equal(classifyVapiError(p), "fatal", JSON.stringify(p));
});

test("wiring: only genuine failures show the red message and force Ended", () => {
  const src = readFileSync(
    new URL("../src/components/VoiceControls.tsx", import.meta.url),
    "utf8",
  );
  const start = src.indexOf("const onError");
  const body = src.slice(start, src.indexOf("};", start));
  const idxEnded = body.indexOf('kind === "call-ended"');
  const idxNonCrit = body.indexOf('kind === "non-critical"');
  const idxRedMsg = body.indexOf("Something went wrong with the call.");
  assert.ok(idxEnded > -1 && idxNonCrit > -1 && idxRedMsg > -1);
  // both early-return branches come before the red-message line
  assert.ok(idxEnded < idxRedMsg && idxNonCrit < idxRedMsg);
  // each branch ends at its own `return;`
  const nonCritBranch = body.slice(idxNonCrit, body.indexOf("return;", idxNonCrit));
  assert.ok(nonCritBranch.length > 0);
  assert.doesNotMatch(nonCritBranch, /setStatus|setError/);
  const endedBranch = body.slice(idxEnded, body.indexOf("return;", idxEnded));
  assert.ok(endedBranch.length > 0);
  assert.doesNotMatch(endedBranch, /setError/);
});
