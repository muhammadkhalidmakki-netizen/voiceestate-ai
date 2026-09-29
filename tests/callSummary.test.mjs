import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCallSummary, findProjects } from "../src/lib/callSummary.ts";
import { applyUserMessage, INITIAL_LIVE_LEAD } from "../src/lib/qualification.ts";

const A = (text) => ({ role: "assistant", text });
const U = (text) => ({ role: "user", text });

// Run the user lines through the real reducer, like the app does.
const leadFrom = (entries) =>
  entries
    .filter((e) => e.role === "user")
    .reduce((s, e) => applyUserMessage(s, e.text), INITIAL_LIVE_LEAD);

const summarize = (entries) => buildCallSummary(entries, leadFrom(entries));

test("no summary when the lead never spoke", () => {
  assert.equal(buildCallSummary([], INITIAL_LIVE_LEAD), null);
  assert.equal(buildCallSummary([A("Hello, is this James?")], INITIAL_LIVE_LEAD), null);
});

test("qualified call: summary, outcome, project come from the real conversation", () => {
  const s = summarize([
    A("Hi James, quick question, is it for investment or a home?"),
    U("I want to invest"),
    A("And what's your budget roughly?"),
    U("My budget is two million dirhams"),
    A("Any area in mind?"),
    U("Two bedroom in Dubai Creek Harbour"),
    A("There's a project I think fits: Greenz by Danube. Want the details?"),
    U("Yes I'm interested, send me the details on WhatsApp"),
    A("Perfect, everything will be with you shortly."),
  ]);
  assert.equal(s.outcome, "Qualified");
  assert.equal(s.project, "Greenz by Danube");
  assert.equal(s.nextStep, "WhatsApp details");
  assert.match(s.summary, /2 Bedroom property in Dubai Creek Harbour/);
  assert.match(s.summary, /as an investment/);
  assert.match(s.summary, /AED 2,000,000/);
  assert.ok(s.summary.split(/(?<=\.)\s/).length <= 2, "at most 2 sentences");
});

test("project: only shown if actually named; mishearings map to the real name", () => {
  assert.equal(summarize([A("Hi"), U("hello")]).project, "Not discussed");
  assert.deepEqual(findProjects([A("How about Greens by Danube?")]), ["Greenz by Danube"]);
  assert.deepEqual(findProjects([A("Take a look at Newbury by Sobha Realty")]), [
    "Newbury by Sobha Realty",
  ]);
  // date-ish 'by' phrases are not projects
  assert.deepEqual(findProjects([A("I will send it by Friday"), U("Call me by Monday")]), []);
  assert.deepEqual(findProjects([A("Prices by Danube are attractive")]), []);
});

test("follow-up: callback request with the time the lead actually gave", () => {
  const s = summarize([
    A("Is now a good time?"),
    U("I'm busy, can you call me tomorrow?"),
  ]);
  assert.equal(s.outcome, "Follow-up");
  assert.equal(s.nextStep, "Callback requested · tomorrow");
  assert.match(s.summary, /asked to be contacted again later/);
});

test("not interested: no follow-up requested", () => {
  const s = summarize([A("Hi James"), U("Sorry, I'm not interested")]);
  assert.equal(s.outcome, "Not Interested");
  assert.equal(s.nextStep, "No follow-up requested");
  assert.match(s.summary, /not interested/);
});

test("unknown next step defaults to 'Follow-up required'", () => {
  const s = summarize([A("Hi"), U("I'm looking for a villa in Arjan")]);
  assert.equal(s.outcome, "New Lead");
  assert.equal(s.nextStep, "Follow-up required");
  assert.match(s.summary, /a Villa in Arjan/);
});

test("WhatsApp only counts if the lead agreed", () => {
  const agreed = summarize([
    A("Is WhatsApp okay to send the details?"),
    U("Yes sure"),
  ]);
  assert.equal(agreed.nextStep, "WhatsApp details");

  const declined = summarize([
    A("Is WhatsApp okay to send the details?"),
    U("No, please don't"),
  ]);
  assert.equal(declined.nextStep, "Follow-up required");

  const notOffered = summarize([A("Hello"), U("Yes sure")]);
  assert.equal(notOffered.nextStep, "Follow-up required");
});

test("nothing is invented when no requirements were shared", () => {
  const s = summarize([A("Hi"), U("hello")]);
  assert.equal(s.summary, "The lead did not share specific requirements.");
  assert.doesNotMatch(s.summary, /AED|Bedroom|investment/);
});

test("an unconfirmed-currency budget is described honestly", () => {
  const s = summarize([A("Budget?"), U("around 1.5 million")]);
  assert.match(s.summary, /around 1,500,000 \(currency not confirmed\)/);
});

test("wiring: summary is built only after the call has ended", () => {
  const src = readFileSync(
    new URL("../src/components/VoiceControls.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /status === "ended" && lead/);
});
