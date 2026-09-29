import test from "node:test";
import assert from "node:assert/strict";
import { simulate, loadFixture } from "./helpers/simulate.mjs";
import { OPEN_AREA, JOB_STAGE, WRONG_NUMBER_STAGE } from "../src/lib/qualification.ts";

const A = (text) => ({ role: "assistant", text });
const U = (text) => ({ role: "user", text });
const OPENING = A("Hi James, this is Khalid from Time Homes. Do you have a moment to talk?");
const Q_PURPOSE = A("Is this for investment or a home for yourself?");
const Q_BUDGET = A("And what's your budget roughly, any currency is fine.");
const Q_AREA = A("Any area or lifestyle preference in mind, or are you open to suggestions?");
const PITCH = A("The first one is Tilal by Binghatti in Al Rowaya. Does that sound interesting?");
const OFFER = A("Would you like me to send you the full details?");

test("the real call, verbatim: Qualified, open area, scheduled call, no 'ended before' line", () => {
  const r = simulate(loadFixture("real-call-1.txt"));
  assert.equal(r.lead.stage, "Qualified");
  assert.equal(r.lead.qualification.purpose, "Investment");
  assert.equal(r.lead.qualification.budget, "AED 3,000,000");
  assert.equal(r.lead.qualification.preferredArea, OPEN_AREA);
  assert.doesNotMatch(r.summary.summary, /ended before/);
  assert.match(r.summary.nextStep, /Follow-up call · morning/);
  assert.match(r.summary.nextStep, /WhatsApp/);
  assert.equal(r.summary.project, "Tilal by Binghatti");
  assert.ok(r.summary.summary.split(/(?<=\.)\s/).length <= 2);
});

test("no area ever asked or given: still Qualified", () => {
  const r = simulate([OPENING, U("Yes"), Q_PURPOSE, U("Investment"), Q_BUDGET, U("2 million dirhams"), OFFER, U("Yes please")]);
  assert.equal(r.lead.stage, "Qualified");
  assert.equal(r.lead.qualification.preferredArea, "Not provided");
});

test("filler sentence between the question and the answer does not lose context", () => {
  const r = simulate([Q_PURPOSE, U("Investment"), Q_BUDGET, U("3 million dirhams"), OFFER, A("Great."), U("Yes")]);
  assert.equal(r.lead.stage, "Qualified");
});

test("area answered in several speech-to-text phrasings", () => {
  for (const t of ["I'm open for suggestions.", "I am open to suggestions", "Open", "Not sure yet", "No preference", "Anything is fine", "You suggest"]) {
    const r = simulate([Q_AREA, U(t)]);
    assert.equal(r.lead.qualification.preferredArea, OPEN_AREA, t);
  }
  assert.equal(simulate([Q_AREA, U("Downtown Dubai")]).lead.qualification.preferredArea, "Downtown Dubai");
});

test("area given: appears in summary, stage Qualified", () => {
  const r = simulate([Q_PURPOSE, U("Home for myself"), Q_BUDGET, U("2 million dirhams"), Q_AREA, U("Dubai Marina"), OFFER, U("Yes")]);
  assert.equal(r.lead.stage, "Qualified");
  assert.match(r.summary.summary, /Dubai Marina/);
});

test("not interested", () => {
  const r = simulate([OPENING, U("Yes"), Q_PURPOSE, U("Actually I'm not interested, thanks")]);
  assert.equal(r.lead.stage, "Not Interested");
  assert.equal(r.summary.nextStep, "No follow-up requested");
});

test("job enquiry", () => {
  const r = simulate([OPENING, U("Hi, are you hiring? I'm looking for a job")]);
  assert.equal(r.lead.stage, JOB_STAGE);
  assert.match(r.summary.summary, /job/);
});

test("wrong number", () => {
  const r = simulate([OPENING, U("Sorry, wrong number")]);
  assert.equal(r.lead.stage, WRONG_NUMBER_STAGE);
});

test("callback request => Follow-up with the requested time", () => {
  const r = simulate([OPENING, U("I'm busy, can you call me tomorrow?")]);
  assert.equal(r.lead.stage, "Follow-up");
  assert.match(r.summary.nextStep, /Callback requested · tomorrow/);
  assert.doesNotMatch(r.summary.summary, /ended before/);
});

test("lead asks questions mid-call and a greeting alone never qualifies", () => {
  const r = simulate([A("Great, I saw you were interested in Dubai real estate."), U("Yes")]);
  assert.equal(r.lead.stage, "New Lead");
  const q = simulate([Q_PURPOSE, U("Investment"), Q_BUDGET, U("3 million dirhams"), PITCH, U("What's the price?"), OFFER, U("Yes")]);
  assert.equal(q.lead.stage, "Qualified");
});

test("ended without a next step keeps the honest fallback", () => {
  const r = simulate([Q_PURPOSE, U("Investment"), Q_BUDGET, U("3 million dirhams")]);
  assert.equal(r.lead.stage, "New Lead");
  assert.match(r.summary.summary, /ended before a clear next step/);
});

test("refusal then real interest ends Qualified", () => {
  const r = simulate([Q_PURPOSE, U("Investment"), Q_BUDGET, U("3 million dirhams"), OFFER, U("No, not interested"), A("No problem. Any chance I could send it on WhatsApp?"), U("Sorry, yes I am interested, send it")]);
  assert.equal(r.lead.stage, "Qualified");
});

test("a dollar budget is captured and still qualifies", () => {
  const r = simulate([Q_BUDGET, U("half a million dollars"), Q_PURPOSE, U("Investment"), OFFER, U("Yes")]);
  assert.match(r.lead.qualification.budget, /USD 500,000/);
  assert.equal(r.lead.stage, "Qualified");
});
