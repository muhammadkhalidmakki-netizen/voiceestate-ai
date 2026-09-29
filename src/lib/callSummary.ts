// Builds the compact post-call "AI Call Summary" from what actually happened in
// the browser: the transcript, the live qualification and the live stage.
// Nothing is invented: every phrase is tied to a captured field or a detected
// statement. Returns null when the lead never spoke.
//
// Like qualification.ts, this file has no relative imports so it can be tested
// directly with `node --test`.

export type SummaryEntry = { role: "user" | "assistant"; text: string };

export type SummaryLead = {
  qualification: {
    purpose: string;
    budget: string;
    property: string;
    preferredArea: string;
  };
  stage: string;
};

export type CallSummary = {
  summary: string;
  outcome: string;
  nextStep: string;
  project: string;
};

const NOT_PROVIDED = "Not provided";

// ---------- requirements sentence ----------

const PROPERTY_TYPE_RE = /(apartment|villa|townhouse|penthouse|studio)$/i;

function withArticle(property: string): string {
  const noun = PROPERTY_TYPE_RE.test(property) ? property : `${property} property`;
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

function describeBudget(budget: string): string {
  const [amount, note] = budget.split(" · ");
  return note ? `around ${amount} (${note})` : budget;
}

function describeRequirement(q: SummaryLead["qualification"]): string | null {
  const known =
    q.property !== NOT_PROVIDED ||
    q.preferredArea !== NOT_PROVIDED ||
    q.purpose !== NOT_PROVIDED ||
    q.budget !== NOT_PROVIDED;
  if (!known) return null;

  let text = `looking for ${
    q.property !== NOT_PROVIDED ? withArticle(q.property) : "a property"
  }`;
  const openArea = q.preferredArea === "Open to suggestions";
  if (!openArea && q.preferredArea !== NOT_PROVIDED) text += ` in ${q.preferredArea}`;
  if (q.purpose === "Investment") text += " as an investment";
  else if (q.purpose === "Own Home") text += " as their own home";
  if (q.budget !== NOT_PROVIDED) {
    text += `, with a budget of ${describeBudget(q.budget)}`;
  }
  if (openArea) text += " and is open to area suggestions";
  return text;
}

// ---------- project ----------

// Projects we know by name, with spoken / mis-transcribed variants.
const KNOWN_PROJECTS: [RegExp, string][] = [
  [/\bgreen[sz]\s+by\s+danube\b|\bdanube\s+green[sz]\b|\bgreenz\b/i, "Greenz by Danube"],
];

// "<Name> by <Developer>", the standard Dubai off-plan naming pattern.
const NAME_BY_DEV_RE =
  /\b([A-Z][\w'’&-]*(?:\s+[A-Z][\w'’&-]*){0,3})\s+by\s+([A-Z][\w'’&-]*(?:\s+[A-Z][\w'’&-]*){0,2})\b/g;
const NOT_A_PROJECT_START =
  /^(?:Prices?|Payment|Handover|Starting|Built|Designed|Developed|Located|Managed|Followed|Backed|Call|Send|Reply|Contact|Message|Text|Email|Speak|Talk|Followup|Follow)\b/;
const NOT_A_DEVELOPER =
  /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Tomorrow|Tonight|Morning|Afternoon|Evening|Phone|WhatsApp|Email|Text|Message|Yes|No|Me|You|Us|Them|Then|Now|Today|Next|Noon)\b/;

export function findProjects(entries: SummaryEntry[]): string[] {
  const seen = new Map<string, number>(); // canonical name -> first position
  const text = entries.map((e) => e.text).join("\n");

  for (const [re, canonical] of KNOWN_PROJECTS) {
    const m = re.exec(text);
    if (m && !seen.has(canonical)) seen.set(canonical, m.index);
  }
  for (const m of text.matchAll(NAME_BY_DEV_RE)) {
    const [, name, developer] = m;
    if (NOT_A_PROJECT_START.test(name) || NOT_A_DEVELOPER.test(developer)) continue;
    const full = `${name} by ${developer}`;
    const alreadyKnown = KNOWN_PROJECTS.some(([re]) => re.test(full));
    if (!alreadyKnown && !seen.has(full)) seen.set(full, m.index ?? 0);
  }
  return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n);
}

// ---------- next step ----------

const CALLBACK_RE =
  /\b(?:call|ring|contact|reach|phone|ping)\b[^.?!]{0,15}\b(?:back|later|tomorrow|tonight|next\s+(?:week|month)|this\s+(?:evening|afternoon|weekend)|in\s+the\s+(?:morning|afternoon|evening))\b|\bcall-?back\b|\bget\s+back\s+to\s+me\b/i;
const TIMING_RE =
  /\b(tomorrow|tonight|next\s+week|next\s+month|this\s+(?:evening|afternoon|weekend)|in\s+the\s+(?:morning|afternoon|evening)|on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|later)\b/i;
const WHATSAPP_RE = /\bwhats\s?app\b/i;
const AFFIRMATIVE_RE =
  /\b(?:yes|yeah|yep|sure|ok(?:ay)?|please|fine|go\s+ahead|that\s+works|of\s+course|absolutely)\b/i;
const NEGATIVE_RE = /\b(?:no|nope|don'?t|do\s+not|not)\b/i;

function detectCallback(users: SummaryEntry[], stage: string): string | null {
  const hit = [...users].reverse().find((e) => CALLBACK_RE.test(e.text));
  if (!hit && stage !== "Follow-up") return null;
  const when = hit ? TIMING_RE.exec(hit.text)?.[1]?.toLowerCase() : undefined;
  return when ? `Callback requested · ${when}` : "Callback requested";
}

function detectWhatsApp(entries: SummaryEntry[]): boolean {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!WHATSAPP_RE.test(e.text)) continue;
    if (e.role === "user") return !NEGATIVE_RE.test(e.text) || AFFIRMATIVE_RE.test(e.text);
    // assistant offered WhatsApp: needs an affirmative user reply right after
    const reply = entries.slice(i + 1).find((x) => x.role === "user");
    if (reply && AFFIRMATIVE_RE.test(reply.text) && !/^\s*no\b/i.test(reply.text)) {
      return true;
    }
  }
  return false;
}

// A follow-up call that was booked during the conversation: the assistant asks
// when, the lead names a time; or the assistant confirms "Expect a call ...".
const SCHEDULE_Q_RE =
  /\b(?:morning\s+or\s+afternoon|what\s+(?:day|time)|best\s+time|when\s+(?:works|would|is\s+good)|which\s+(?:day|time))\b/i;
const WHEN_RE =
  /\b(morning|afternoon|evening|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i;
const EXPECT_CALL_RE = /\b(?:expect\s+a\s+call|will\s+(?:call|ring)\s+you|give\s+you\s+a\s+call)\b/i;

function detectScheduledCall(entries: SummaryEntry[]): string | null {
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.role !== "assistant") continue;
    if (SCHEDULE_Q_RE.test(e.text)) {
      // the lead's next real answer (skip nothing: first user turn after the question)
      const reply = entries.slice(i + 1).find((x) => x.role === "user");
      const when = reply && !NEGATIVE_RE.test(reply.text.replace(/bnot\s+sureb/i, "")) ? WHEN_RE.exec(reply.text)?.[1] : undefined;
      if (when) return `Follow-up call · ${when.toLowerCase()}`;
    }
    if (EXPECT_CALL_RE.test(e.text)) {
      const when = WHEN_RE.exec(e.text)?.[1] ?? TIMING_RE.exec(e.text)?.[1];
      if (when) return `Follow-up call · ${when.toLowerCase().replace(/^in the /, "")}`;
    }
  }
  return null;
}

function nextStep(entries: SummaryEntry[], stage: string): string {
  if (
    stage === "Not Interested" ||
    stage === "Junk · Job Enquiry" ||
    stage === "Wrong Number"
  ) {
    return "No follow-up requested";
  }
  const users = entries.filter((e) => e.role === "user");
  const steps: string[] = [];
  const callback = detectCallback(users, stage);
  if (callback) steps.push(callback);
  else {
    const scheduled = detectScheduledCall(entries);
    if (scheduled) steps.push(scheduled);
  }
  if (detectWhatsApp(entries)) steps.push("WhatsApp details");
  return steps.length ? steps.join(" · ") : "Follow-up required";
}

// ---------- public ----------

export function buildCallSummary(
  entries: SummaryEntry[],
  lead: SummaryLead,
): CallSummary | null {
  if (!entries.some((e) => e.role === "user" && e.text.trim())) return null;

  const { stage, qualification } = lead;
  const requirement = describeRequirement(qualification);

  const sentences: string[] = [];
  if (stage === "Junk · Job Enquiry") {
    sentences.push("The lead was asking about a job, not a property.");
  } else if (stage === "Wrong Number") {
    sentences.push("This looks like a wrong number.");
  } else if (stage === "Not Interested") {
    sentences.push("The lead said they are not interested.");
    if (requirement) sentences.push(`They had been ${requirement}.`);
  } else {
    sentences.push(
      requirement
        ? `The lead is ${requirement}.`
        : "The lead did not share specific requirements.",
    );
    if (stage === "Follow-up") {
      sentences.push("They asked to be contacted again later.");
    } else if (stage === "Qualified") {
      const agreed = nextStep(entries, stage);
      const wa = /WhatsApp/.test(agreed);
      const bits: string[] = [];
      if (wa) bits.push("to receive the details on WhatsApp");
      if (/^Follow-up call/.test(agreed)) bits.push(`for a follow-up call (${agreed.split(" · ")[1] ?? "time agreed"})`);
      else if (/^Callback/.test(agreed)) bits.push("to be called back");
      sentences.push(
        bits.length
          ? `They showed interest and agreed ${bits.join(" and ")}.`
          : "They showed interest and shared the key details.",
      );
    } else if (requirement && nextStep(entries, stage) === "Follow-up required") {
      sentences.push("The call ended before a clear next step was agreed.");
    }
  }

  const projects = findProjects(entries);

  return {
    summary: sentences.join(" "),
    outcome: stage,
    nextStep: nextStep(entries, stage),
    project: projects.length ? projects.slice(0, 2).join(", ") : "Not discussed",
  };
}
