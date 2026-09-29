// Run with: npm test   (uses Node's built-in test runner, no dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analyzeBudget,
  applyUserMessage,
  detectStageSignals,
  extractArea,
  extractProperty,
  extractPurpose,
  INITIAL_LIVE_LEAD,
} from "../src/lib/qualification.ts";

const budget = (t) => analyzeBudget(t).budget;

// Feed a list of USER utterances through the reducer.
const run = (...messages) =>
  messages.reduce((s, m) => applyUserMessage(s, m), INITIAL_LIVE_LEAD);

test("budget: natural phrases with a stated currency", () => {
  const cases = [
    ["My budget is two million dirhams", "AED 2,000,000"],
    ["I'm looking around two million AED", "AED 2,000,000"],
    ["My budget is AED 2 million", "AED 2,000,000"],
    ["I can spend about 2.5 million dirhams", "AED 2,500,000"],
    ["two and a half million dirhams", "AED 2,500,000"],
    ["around 2,000,000 dirhams", "AED 2,000,000"],
    ["My budget is 2 million A.E.D.", "AED 2,000,000"],
    ["it's around 1.5 million in AED", "AED 1,500,000"],
    ["In dirhams, roughly two million", "AED 2,000,000"],
    ["500,000 dollars", "USD 500,000"],
    ["$750,000", "USD 750,000"],
  ];
  for (const [text, expected] of cases) {
    assert.equal(budget(text), expected, text);
  }
});

test("budget: 'around 1.5 million' without currency is pending, not guessed", () => {
  const r = analyzeBudget("around 1.5 million");
  assert.equal(r.budget, null);
  assert.equal(r.pendingAmount, 1_500_000);

  const s1 = run("around 1.5 million");
  assert.equal(s1.qualification.budget, "1,500,000 · currency not confirmed");
  assert.equal(s1.pendingAmount, 1_500_000);

  // currency confirmed by a later reply
  const s2 = run("around 1.5 million", "dirhams");
  assert.equal(s2.qualification.budget, "AED 1,500,000");
  assert.equal(s2.pendingAmount, null);

  const s3 = run("about two million", "Sorry, it's in dollars.");
  assert.equal(s3.qualification.budget, "USD 2,000,000");
});

test("budget: things that must NOT be captured", () => {
  const none = [
    "hello, how are you",
    "I can pay 5,000 dirhams a month", // monthly payment
    "between 1 and 2 million dirhams", // range
    "two dollars", // too small to be a budget
    "I need 2 bedrooms", // not money
    "one million dirhams or two million dollars", // conflicting
  ];
  for (const text of none) {
    const r = analyzeBudget(text);
    assert.equal(r.budget, null, text);
    assert.equal(r.pendingAmount, null, text);
  }
});

test("budget: a stray currency word alone never sets a budget", () => {
  const s = run("dirhams");
  assert.equal(s.qualification.budget, "Not provided");
});

test("wiring: only FINAL USER transcripts reach the extractor", () => {
  // The reducer trusts its caller, so guard the call site itself: assistant
  // messages (e.g. a quoted project price) and partial transcripts must never
  // be forwarded.
  const src = readFileSync(
    new URL("../src/components/VoiceControls.tsx", import.meta.url),
    "utf8",
  );
  const calls = src.match(/onUserFinalRef\.current\?\.\(/g) ?? [];
  assert.equal(calls.length, 1, "exactly one forwarding call site");
  assert.match(
    src,
    /if \(final && role === "user"\) onUserFinalRef\.current\?\.\(text\);/,
  );
});

test("budget: a confirmed budget is not overwritten by an unconfirmed amount", () => {
  const s = run("my budget is two million dirhams", "maybe three million");
  assert.equal(s.qualification.budget, "AED 2,000,000");
});

test("budget: a spoken correction keeps the currency the lead already confirmed", () => {
  // the reported live call: 2M dirhams, then "Because it is 4 million."
  const s = run("My budget is two million dirhams", "Because it is 4 million.");
  assert.equal(s.qualification.budget, "AED 4,000,000");
  assert.equal(s.pendingAmount, null);

  // other cue wording
  for (const text of ["Actually make it 3 million", "I can go up to 5 million", "no, my budget is 2.5 million"]) {
    const r = run("about two million dirhams", text);
    assert.notEqual(r.qualification.budget, "AED 2,000,000", text);
    assert.match(r.qualification.budget, /^AED [\d,]+$/, text);
  }

  // the confirmed currency is what carries over, not a hardcoded AED
  const usd = run("my budget is 500,000 dollars", "actually it's 1 million");
  assert.equal(usd.qualification.budget, "USD 1,000,000");

  // an explicit new currency still wins
  const explicit = run("two million dirhams", "actually 1 million dollars");
  assert.equal(explicit.qualification.budget, "USD 1,000,000");
});

test("budget: passing mentions without budget wording do not overwrite it", () => {
  for (const text of ["maybe three million", "I saw a villa listed at 3 million", "4 million"]) {
    const s = run("my budget is two million dirhams", text);
    assert.equal(s.qualification.budget, "AED 2,000,000", text);
  }
  // a correction with no confirmed currency yet stays unconfirmed (no guessing)
  const s = run("around 2 million", "actually make it 4 million");
  assert.equal(s.qualification.budget, "4,000,000 · currency not confirmed");
});

test("purpose / property / area basics", () => {
  assert.equal(extractPurpose("It's for investment"), "Investment");
  assert.equal(extractPurpose("for my family"), "Own Home");
  assert.equal(extractPurpose("Not for investment, it's to live in"), "Own Home");
  assert.equal(extractPurpose("investment but also to live in"), null);
  assert.equal(extractProperty("two bedroom"), "2 Bedroom");
  assert.equal(extractProperty("a 3 bedroom villa"), "3 Bedroom Villa");
  assert.equal(extractProperty("two or three bedroom"), null);
  assert.equal(extractArea("Dubai Creek Harbour"), "Dubai Creek Harbour");
  assert.equal(extractArea("creek harbor or marina"), null);
  assert.equal(extractArea("not Marina"), null);
});

test("stage: starts as New Lead", () => {
  assert.equal(INITIAL_LIVE_LEAD.stage, "New Lead");
  assert.equal(run("hello there").stage, "New Lead");
});

test("stage: Qualified needs core details AND buying/investing intent", () => {
  // core details only, no intent -> still New Lead
  const noIntent = run(
    "for investment",
    "my budget is two million dirhams",
    "Dubai Creek Harbour",
  );
  assert.equal(noIntent.stage, "New Lead");

  // core + intent -> Qualified
  const qualified = run(
    "I want to invest",
    "my budget is two million dirhams",
    "two bedroom in Dubai Creek Harbour",
  );
  assert.equal(qualified.stage, "Qualified");

  // intent arriving last also qualifies
  const late = run(
    "for investment",
    "two million dirhams",
    "Dubai Creek Harbour",
    "yes I'm interested, send me the details",
  );
  assert.equal(late.stage, "Qualified");

  // an unconfirmed-currency budget is not enough
  const pending = run("I want to invest", "around 2 million", "Dubai Creek Harbour");
  assert.equal(pending.stage, "New Lead");
});

test("stage: Follow-up when the lead asks to be contacted later", () => {
  const phrases = [
    "Can you call me tomorrow?",
    "call me back later",
    "Please call me in the afternoon",
    "I'm busy right now",
    "give me a call next week",
    "not interested right now, maybe later",
  ];
  for (const p of phrases) {
    assert.equal(run(p).stage, "Follow-up", p);
  }
});

test("stage: Not Interested only on a clear refusal", () => {
  const phrases = [
    "I'm not interested",
    "not really interested, thanks",
    "please stop calling me",
    "don't call me again",
  ];
  for (const p of phrases) {
    assert.equal(run(p).stage, "Not Interested", p);
  }
  // 'not interested' must not register as intent
  assert.equal(detectStageSignals("I'm not interested").intent, false);
  // a soft no is a follow-up, not a refusal
  assert.equal(detectStageSignals("not interested right now").notInterested, false);
});

test("stage: later explicit statements update the stage", () => {
  const s = run("I'm not interested", "actually call me tomorrow");
  assert.equal(s.stage, "Follow-up");
});
