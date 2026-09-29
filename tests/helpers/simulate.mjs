// Test support (not a test): replays a whole conversation through the same
// pure code the demo page uses, so a scenario can be checked end to end.
import { readFileSync } from "node:fs";
import {
  applyUserMessage,
  INITIAL_LIVE_LEAD,
  rememberAssistant,
} from "../../src/lib/qualification.ts";
import { buildCallSummary } from "../../src/lib/callSummary.ts";

/** Parses a pasted transcript: "You" / "VoiceEstate AI" lines are speaker
 *  markers; an unlabeled first line is the assistant's opening. */
export function parseTranscript(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries = [];
  let role = "assistant";
  for (const line of lines) {
    if (line === "You") role = "user";
    else if (line === "VoiceEstate AI") role = "assistant";
    else entries.push({ role, text: line });
  }
  return entries;
}

export function loadFixture(name) {
  return parseTranscript(
    readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"),
  );
}

/** Feeds entries in order, exactly like DemoWorkspace: assistant finals are
 *  remembered as context; each user final updates the lead. Returns each step. */
export function simulate(entries) {
  let lead = INITIAL_LIVE_LEAD;
  let context = "";
  const steps = [];
  for (const e of entries) {
    if (e.role === "assistant") {
      context = rememberAssistant(context, e.text);
      continue;
    }
    lead = applyUserMessage(lead, e.text, { assistantText: context });
    steps.push({ user: e.text, stage: lead.stage, qualification: lead.qualification });
  }
  return { lead, steps, summary: buildCallSummary(entries, lead) };
}
