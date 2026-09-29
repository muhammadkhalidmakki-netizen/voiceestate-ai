// Browser-side limits for the public demo: a per-call time cap, a cooldown
// between calls and a rolling daily cap.
//
// IMPORTANT: this is friction, not security. The history lives in localStorage
// and can be cleared, and anyone holding the public key + assistant ID can call
// Vapi directly. The real ceilings must also be set on the Vapi side (assistant
// maxDurationSeconds, spend and concurrency caps).
//
// No relative imports, so it can be tested directly with `node --test`.

export const MAX_CALL_SECONDS = 180; // 3 minutes
export const COOLDOWN_SECONDS = 60;
export const MAX_CALLS_PER_DAY = 5; // rolling 24 hours

const DAY_MS = 24 * 60 * 60 * 1000;
export const STORAGE_KEY = "voiceestate.demoCalls.v1";

export const DURATION_LIMIT_MESSAGE = `Demo calls are limited to ${
  MAX_CALL_SECONDS / 60
} minutes, so this one has ended. You can start another after a short break.`;

/** One demo call. `end` is missing while the call is (or may still be) running. */
export type CallRecord = { start: number; end?: number };

export type LimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "cooldown" | "daily-limit";
      retryAfterSeconds: number;
      message: string;
    };

// ---------- formatting ----------

export function formatWait(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  if (s < 3600) {
    const m = Math.ceil(s / 60);
    return `${m} minute${m === 1 ? "" : "s"}`;
  }
  const h = Math.ceil(s / 3600);
  return `about ${h} hour${h === 1 ? "" : "s"}`;
}

/** 165 -> "2:45" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- pure history logic ----------

/** Keeps only calls that started within the last 24 hours. */
export function pruneHistory(history: CallRecord[], now: number): CallRecord[] {
  return history.filter((r) => now - r.start < DAY_MS);
}

export function checkCallAllowed(history: CallRecord[], now: number): LimitDecision {
  const recent = pruneHistory(history, now);

  // 1) daily cap (rolling 24h): frees up when the oldest call ages out
  if (recent.length >= MAX_CALLS_PER_DAY) {
    const oldest = Math.min(...recent.map((r) => r.start));
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + DAY_MS - now) / 1000));
    return {
      allowed: false,
      reason: "daily-limit",
      retryAfterSeconds,
      message: `You've used all ${MAX_CALLS_PER_DAY} demo calls for today. Please try again in ${formatWait(retryAfterSeconds)}.`,
    };
  }

  // 2) cooldown after the latest call. A call with no recorded end (e.g. the tab
  //    was closed) is treated as running for the full maximum duration, so it
  //    also blocks an overlapping call from a second tab.
  if (recent.length > 0) {
    const last = recent.reduce((a, b) => (b.start > a.start ? b : a));
    const finishedAt =
      last.end !== undefined
        ? Math.max(last.end, last.start)
        : last.start + MAX_CALL_SECONDS * 1000;
    const waitMs = finishedAt + COOLDOWN_SECONDS * 1000 - now;
    if (waitMs > 0) {
      const retryAfterSeconds = Math.ceil(waitMs / 1000);
      return {
        allowed: false,
        reason: "cooldown",
        retryAfterSeconds,
        message: `Please wait ${formatWait(retryAfterSeconds)} before starting another demo call.`,
      };
    }
  }

  return { allowed: true };
}

export function recordCallStart(history: CallRecord[], now: number): CallRecord[] {
  return [...pruneHistory(history, now), { start: now }];
}

/** Marks the most recent still-open call as ended. No-op if none is open. */
export function recordCallEnd(history: CallRecord[], now: number): CallRecord[] {
  const i = history.map((r) => r.end === undefined).lastIndexOf(true);
  if (i === -1) return history;
  const next = history.slice();
  next[i] = { ...next[i], end: Math.max(now, next[i].start) };
  return next;
}

/** Undoes the latest start (used when a call fails before it connects). */
export function discardLastStart(history: CallRecord[]): CallRecord[] {
  const i = history.map((r) => r.end === undefined).lastIndexOf(true);
  if (i === -1) return history;
  return history.filter((_, idx) => idx !== i);
}

// ---------- storage (always fails safe) ----------

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

// Fallback so limits still apply within a session if localStorage is blocked
// (private mode, disabled site data, etc.).
let memory: CallRecord[] = [];

export function getBrowserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is CallRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.start === "number" &&
    Number.isFinite(r.start) &&
    (r.end === undefined || (typeof r.end === "number" && Number.isFinite(r.end)))
  );
}

export function loadHistory(storage: StorageLike | null): CallRecord[] {
  if (!storage) return memory.slice();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return memory.slice();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const clean = parsed.filter(isRecord);
    memory = clean;
    return clean.slice();
  } catch {
    return memory.slice();
  }
}

export function saveHistory(history: CallRecord[], storage: StorageLike | null): void {
  memory = history.slice();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // storage full / blocked: the in-memory copy still enforces limits
  }
}

/** Test helper: forget the in-memory fallback. */
export function resetMemoryForTests(): void {
  memory = [];
}
