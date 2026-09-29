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
  if (q.preferredArea !== NOT_PROVIDED) text += ` in ${q.preferredArea}`;
  if (q.purpose === "Investment") text += " as an investment";
  else if (q.purpose === "Own Home") text += " as their own home";
  if (q.budget !== NOT_PROVIDED) {
    text += `, with a budget of ${describeBudget(q.budget)}`;
  }
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

function nextStep(entries: SummaryEntry[], stage: string): string {
  if (stage === "Not Interested") return "No follow-up requested";
  const users = entries.filter((e) => e.role === "user");
  const steps: string[] = [];
  const callback = detectCallback(users, stage);
  if (callback) steps.push(callback);
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
  if (stage === "Not Interested") {
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
      sentences.push("They showed interest and shared the key details.");
    } else if (requirement) {
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
