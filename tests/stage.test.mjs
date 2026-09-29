import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyUserMessage,
  assistantMadeOffer,
  detectStageSignals,
  INITIAL_LIVE_LEAD,
  isAffirmativeReply,
  isCoreQualified,
  JOB_STAGE,
  OPEN_AREA,
  WRONG_NUMBER_STAGE,
} from "../src/lib/qualification.ts";
import { buildCallSummary } from "../src/lib/callSummary.ts";

// The assistant's real questions (project-context/05_vapi_system_prompt.md).
const Q_PURPOSE = "Quick question, are you looking for an investment or a home for yourself?";
const Q_BUDGET = "And what's your budget roughly, any currency is fine.";
const Q_AREA = "Any area or lifestyle preference in mind, or are you open to suggestions?";
const PITCH = "There's a project I think could be a great fit, Tilal by Binghatti. Does that sound interesting?";
const OFFER = "Want me to send you the full details?";
const WHATSAPP = "Is WhatsApp okay to send the details across?";

// [assistant sentence, lead reply] turns, exactly as the app feeds the reducer.
const play = (turns) =>
  turns.reduce(
    (s, [assistantText, user]) => applyUserMessage(s, user, { assistantText }),
    INITIAL_LIVE_LEAD,
  );

test("the reported call: purpose + budget + 'open to suggestions' + 'yes' => Qualified", () => {
  const s = play([
    [Q_PURPOSE, "Investment"],
    [Q_BUDGET, "Around three million dirhams"],
    [Q_AREA, "I am open to suggestions"],
    [PITCH, "Yes"],
    [OFFER, "Yes please"],
  ]);
  assert.equal(s.stage, "Qualified");
  assert.equal(s.qualification.purpose, "Investment");
  assert.equal(s.qualification.budget, "AED 3,000,000");
  assert.equal(s.qualification.preferredArea, OPEN_AREA);
});

test("one-word answers work too, using the assistant's question as context", () => {
  const s = play([
    [Q_PURPOSE, "investment"],
    [Q_BUDGET, "three million dirhams"],
    [Q_AREA, "open"],
    [OFFER, "yes"],
  ]);
  assert.equal(s.stage, "Qualified");
  assert.equal(s.qualification.preferredArea, OPEN_AREA);
});

test("area and property are optional: purpose + budget + an accepted offer is enough", () => {
  const s = play([[Q_PURPOSE, "investment"], [Q_BUDGET, "3 million dirhams"], [WHATSAPP, "Yes sure"]]);
  assert.equal(s.stage, "Qualified");
  assert.equal(s.qualification.preferredArea, "Not provided");
  assert.equal(isCoreQualified(s.qualification, s.pendingAmount), true);
});

test("guard rails: no interest, no offer, or an unconfirmed budget => not Qualified", () => {
  // details but never any interest
  assert.equal(play([[Q_PURPOSE, "Investment"], [Q_BUDGET, "three million dirhams"], [Q_AREA, "Dubai Marina"]]).stage, "New Lead");
  // a 'yes' that is not answering an offer
  assert.equal(play([[Q_PURPOSE, "Investment"], [Q_BUDGET, "three million dirhams"], ["Thanks for that.", "Yes"]]).stage, "New Lead");
  // a 'yes' with no context at all
  assert.equal(play([["", "Investment"], ["", "three million dirhams"], ["", "yes"]]).stage, "New Lead");
  // budget with no currency is still pending
  assert.equal(play([[Q_PURPOSE, "Investment"], [Q_BUDGET, "around 3 million"], [OFFER, "yes please"]]).stage, "New Lead");
  // purpose missing
  assert.equal(play([[Q_BUDGET, "three million dirhams"], [OFFER, "yes please"]]).stage, "New Lead");
});

test("a specific area is never replaced by 'open to suggestions'", () => {
  const s = play([[Q_AREA, "Dubai Marina"], ["Anything else?", "I am open to suggestions too"]]);
  assert.equal(s.qualification.preferredArea, "Dubai Marina");
  // and a later specific area replaces the open placeholder
  const t = play([[Q_AREA, "open"], ["Great.", "actually Business Bay"]]);
  assert.equal(t.qualification.preferredArea, "Business Bay");
});

test("'open' means nothing unless it answers the area question", () => {
  assert.equal(play([[Q_PURPOSE, "open"]]).qualification.preferredArea, "Not provided");
  assert.equal(play([[Q_BUDGET, "I'm open to investing"]]).qualification.preferredArea, "Not provided");
  assert.equal(play([[Q_AREA, "open"]]).qualification.preferredArea, OPEN_AREA);
  assert.equal(play([[Q_AREA, "Not sure about the area yet"]]).qualification.preferredArea, OPEN_AREA);
});

test("Not Interested, Follow-up, Junk (job) and Wrong Number each set their own stage", () => {
  assert.equal(play([[OFFER, "No thanks, I'm not interested"]]).stage, "Not Interested");
  assert.equal(play([[Q_PURPOSE, "I'm busy, can you call me tomorrow?"]]).stage, "Follow-up");
  for (const t of [
    "Hello, are you hiring? I am looking for a job",
    "Is this about a job?",
    "I applied for a position, any vacancies?",
    "Can I send you my CV?",
  ]) {
    assert.equal(play([["Hi, is this James?", t]]).stage, JOB_STAGE, t);
  }
  for (const t of ["Sorry, you have the wrong number", "wrong person", "I am not James"]) {
    assert.equal(play([["Hi, is this James?", t]]).stage, WRONG_NUMBER_STAGE, t);
  }
});

test("ordinary talk about work or names does not trigger junk / wrong number", () => {
  for (const t of [
    "I just got a new job in Dubai and want to invest",
    "My work is in Business Bay",
    "It is for my family",
    "James speaking",
  ]) {
    const sig = detectStageSignals(t);
    assert.equal(sig.jobEnquiry, false, t);
    assert.equal(sig.wrongNumber, false, t);
  }
});

test("a job enquiry can't be 'interested', and can't be qualified by a later yes alone", () => {
  assert.equal(detectStageSignals("looking for a job, sounds good").intent, false);
  const s = play([[Q_PURPOSE, "I am looking for a job"], [OFFER, "yes"]]);
  assert.equal(s.stage, JOB_STAGE); // no purpose/budget, so it never qualifies
});

test("the latest explicit statement wins: a refusal, then real interest", () => {
  const s = play([
    [Q_PURPOSE, "Investment"],
    [Q_BUDGET, "three million dirhams"],
    [OFFER, "Actually no, not interested"],
    [WHATSAPP, "Sorry, yes I am interested, send me the details"],
  ]);
  assert.equal(s.stage, "Qualified");
});

test("reading a reply: what counts as an offer and as a clean 'yes'", () => {
  assert.equal(assistantMadeOffer(OFFER), true);
  assert.equal(assistantMadeOffer(WHATSAPP), true);
  assert.equal(assistantMadeOffer(PITCH), true);
  assert.equal(assistantMadeOffer("Thanks for that."), false);
  assert.equal(assistantMadeOffer("Send you the details"), false); // not a question
  assert.equal(assistantMadeOffer(undefined), false);
  for (const y of ["Yes", "yeah sure", "Sure, go ahead", "Okay please", "Absolutely"]) assert.equal(isAffirmativeReply(y), true, y);
  for (const n of ["No", "yes but later", "maybe", "not now", "Investment", "I am busy right now yes"]) assert.equal(isAffirmativeReply(n), false, n);
});

test("the call summary understands the new stages", () => {
  const entries = (t) => [{ role: "assistant", text: "Hi James" }, { role: "user", text: t }];
  const empty = { purpose: "Not provided", budget: "Not provided", property: "Not provided", preferredArea: "Not provided" };
  const job = buildCallSummary(entries("I need a job"), { qualification: empty, stage: JOB_STAGE });
  assert.match(job.summary, /asking about a job, not a property/);
  assert.equal(job.nextStep, "No follow-up requested");
  assert.equal(job.outcome, JOB_STAGE);
  const wrong = buildCallSummary(entries("wrong number"), { qualification: empty, stage: WRONG_NUMBER_STAGE });
  assert.match(wrong.summary, /wrong number/);
  assert.equal(wrong.nextStep, "No follow-up requested");
});

test("wiring: assistant text is context only, and every stage has a color", () => {
  const vc = readFileSync(new URL("../src/components/VoiceControls.tsx", import.meta.url), "utf8");
  // final assistant sentences go to their own callback, never to the extractor
  assert.match(vc, /if \(final && role === "assistant"\) onAssistantFinalRef\.current\?\.\(text\);/);
  assert.equal((vc.match(/onUserFinalRef\.current\?\.\(/g) ?? []).length, 1);
  assert.match(vc, /if \(final && role === "user"\) onUserFinalRef\.current\?\.\(text\);/);

  const ws = readFileSync(new URL("../src/components/DemoWorkspace.tsx", import.meta.url), "utf8");
  assert.match(ws, /applyUserMessage\(prev, text, \{ assistantText \}\)/);
  assert.match(ws, /lastAssistantText\.current = ""/); // cleared when a new call starts

  const card = readFileSync(new URL("../src/components/LeadCard.tsx", import.meta.url), "utf8");
  for (const stage of ["New Lead", "Qualified", "Follow-up", "Not Interested", "Junk · Job Enquiry", "Wrong Number"]) {
    assert.ok(card.includes(`"${stage}": {`) || card.includes(`${stage}: {`), `no color for stage: ${stage}`);
  }
});
