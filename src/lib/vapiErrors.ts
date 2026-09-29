// Classifies the payloads the Vapi Web SDK emits on its `error` event.
//
// The SDK forwards more than real failures on that event:
//  - when a call finishes, Vapi deletes the Daily room and the browser is
//    "ejected", which Daily reports as an error ("Meeting has ended");
//  - a few setup steps (audio processing, audio observer, video recording)
//    emit `error` even though the SDK itself says the call continues.
//
// No relative imports, so this can be tested directly with `node --test`.

export type VapiErrorKind =
  /** The call finished normally (room closed / participant ejected). */
  | "call-ended"
  /** The SDK says the call continues; log it, don't change call state. */
  | "non-critical"
  /** A genuine failure. */
  | "fatal";

// Set-up steps the SDK marks "non-critical" / "optional" and does not throw on.
const NON_CRITICAL_TYPES = new Set([
  "audio-processing-setup-error",
  "audio-processor-recovery-error",
  "audio-observer-setup-error",
  "video-recording-setup-error",
]);

// Daily's own error types for a meeting that has been closed.
const CALL_ENDED_DAILY_TYPES = new Set(["ejected", "no-room"]);

const CALL_ENDED_MESSAGE_RE =
  /meeting has ended|room was deleted|meeting ended due to ejection/i;

type Loose = {
  type?: unknown;
  errorMsg?: unknown;
  msg?: unknown;
  error?: unknown;
  message?: unknown;
};

function asObject(v: unknown): Loose | null {
  return v && typeof v === "object" ? (v as Loose) : null;
}

/** Collects every Daily `type` and message string nested in the payload. */
function collect(payload: unknown, depth = 0, out = { types: [] as string[], texts: [] as string[] }) {
  if (depth > 4) return out;
  if (typeof payload === "string") {
    out.texts.push(payload);
    return out;
  }
  const o = asObject(payload);
  if (!o) return out;
  if (typeof o.type === "string") out.types.push(o.type);
  for (const key of ["errorMsg", "msg"] as const) {
    if (typeof o[key] === "string") out.texts.push(o[key] as string);
  }
  collect(o.error, depth + 1, out);
  collect(o.message, depth + 1, out);
  return out;
}

export function classifyVapiError(payload: unknown): VapiErrorKind {
  const outer = asObject(payload);
  const outerType = typeof outer?.type === "string" ? outer.type : "";

  if (NON_CRITICAL_TYPES.has(outerType)) return "non-critical";

  // Only Daily's own errors can mean "the meeting is over".
  if (outerType === "daily-error") {
    const { types, texts } = collect(payload);
    if (
      types.some((t) => CALL_ENDED_DAILY_TYPES.has(t)) ||
      texts.some((t) => CALL_ENDED_MESSAGE_RE.test(t))
    ) {
      return "call-ended";
    }
  }

  return "fatal";
}
