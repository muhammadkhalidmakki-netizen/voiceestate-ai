import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  checkCallAllowed,
  COOLDOWN_SECONDS,
  discardLastStart,
  formatClock,
  formatWait,
  loadHistory,
  MAX_CALL_SECONDS,
  MAX_CALLS_PER_DAY,
  pruneHistory,
  recordCallEnd,
  recordCallStart,
  resetMemoryForTests,
  saveHistory,
  STORAGE_KEY,
} from "../src/lib/demoLimits.ts";

const S = 1000;
const HOUR = 3600 * S;
const T0 = 1_800_000_000_000; // arbitrary fixed "now"

// fake localStorage
const fakeStorage = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
  };
};

test("limits are 3 minutes, 60 seconds, 5 per day", () => {
  assert.equal(MAX_CALL_SECONDS, 180);
  assert.equal(COOLDOWN_SECONDS, 60);
  assert.equal(MAX_CALLS_PER_DAY, 5);
});

test("first call is allowed", () => {
  assert.deepEqual(checkCallAllowed([], T0), { allowed: true });
});

test("cooldown: counts from when the previous call ENDED", () => {
  const h = [{ start: T0, end: T0 + 100 * S }];
  const early = checkCallAllowed(h, T0 + 130 * S); // 30s after the end
  assert.equal(early.allowed, false);
  assert.equal(early.reason, "cooldown");
  assert.equal(early.retryAfterSeconds, 30);
  assert.match(early.message, /wait 30 seconds/i);

  assert.equal(checkCallAllowed(h, T0 + 160 * S).allowed, true); // 60s after the end
  assert.equal(checkCallAllowed(h, T0 + 161 * S).allowed, true);
  assert.equal(checkCallAllowed(h, T0 + 159 * S).allowed, false); // 59s after
});

test("cooldown: an unfinished call (tab closed) blocks for max duration + cooldown", () => {
  const h = [{ start: T0 }]; // no end recorded
  const d = checkCallAllowed(h, T0 + 10 * S);
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "cooldown");
  assert.equal(d.retryAfterSeconds, MAX_CALL_SECONDS + COOLDOWN_SECONDS - 10);
  assert.equal(checkCallAllowed(h, T0 + (MAX_CALL_SECONDS + COOLDOWN_SECONDS) * S).allowed, true);
});

test("daily limit: 5 calls per rolling 24h, with a friendly message", () => {
  // five finished calls spread over the last few hours
  const h = [0, 1, 2, 3, 4].map((i) => ({
    start: T0 + i * HOUR,
    end: T0 + i * HOUR + 60 * S,
  }));
  const now = T0 + 6 * HOUR;
  const d = checkCallAllowed(h, now);
  assert.equal(d.allowed, false);
  assert.equal(d.reason, "daily-limit");
  // frees up when the OLDEST call is 24h old
  assert.equal(d.retryAfterSeconds, (24 * HOUR - 6 * HOUR) / S);
  assert.match(d.message, /all 5 demo calls for today/);
  assert.match(d.message, /about 18 hours/);

  // 4 calls is still fine (past their cooldowns)
  assert.equal(checkCallAllowed(h.slice(0, 4), now).allowed, true);
});

test("daily limit: old calls age out of the 24h window", () => {
  const h = [0, 1, 2, 3, 4].map((i) => ({ start: T0 + i * S, end: T0 + i * S + 10 * S }));
  assert.equal(checkCallAllowed(h, T0 + 23 * HOUR).allowed, false);
  assert.equal(checkCallAllowed(h, T0 + 24 * HOUR + 1 * S).allowed, true);
  // a call exactly 24h old is out of the window; 1s younger is still in
  assert.equal(pruneHistory(h, T0 + 24 * HOUR).length, 4); // only the +0s call aged out
  assert.equal(pruneHistory(h, T0 + 24 * HOUR + 1 * S).length, 3); // +0s and +1s aged out
});

test("record start / end / discard", () => {
  let h = recordCallStart([], T0);
  assert.deepEqual(h, [{ start: T0 }]);
  h = recordCallEnd(h, T0 + 42 * S);
  assert.deepEqual(h, [{ start: T0, end: T0 + 42 * S }]);
  // ending again with nothing open is a no-op
  assert.deepEqual(recordCallEnd(h, T0 + 99 * S), h);

  // a call that failed to connect is removed and doesn't use quota
  let g = recordCallStart(h, T0 + 500 * S);
  assert.equal(g.length, 2);
  g = discardLastStart(g);
  assert.deepEqual(g, h);
});

test("messages are friendly and human-readable", () => {
  assert.equal(formatWait(1), "1 second");
  assert.equal(formatWait(45), "45 seconds");
  assert.equal(formatWait(61), "2 minutes");
  assert.equal(formatWait(3 * 3600), "about 3 hours");
  assert.equal(formatClock(180), "3:00");
  assert.equal(formatClock(165), "2:45");
  assert.equal(formatClock(-4), "0:00");
});

test("storage: round trip, corrupt data, blocked storage all fail safe", () => {
  resetMemoryForTests();
  const st = fakeStorage();
  const h = [{ start: T0, end: T0 + S }, { start: T0 + 5 * S }];
  saveHistory(h, st);
  assert.deepEqual(JSON.parse(st.data.get(STORAGE_KEY)), h);
  assert.deepEqual(loadHistory(st), h);

  // corrupt JSON / wrong shape must not throw and must not block the user
  resetMemoryForTests();
  const bad = fakeStorage();
  bad.data.set(STORAGE_KEY, "{not json");
  assert.deepEqual(loadHistory(bad), []);
  bad.data.set(STORAGE_KEY, JSON.stringify({ nope: true }));
  assert.deepEqual(loadHistory(bad), []);
  bad.data.set(STORAGE_KEY, JSON.stringify([{ start: "x" }, { start: 5 }, null, { start: 6, end: "y" }]));
  assert.deepEqual(loadHistory(bad), [{ start: 5 }]);

  // storage that throws (private mode): limits still apply via the in-memory copy
  resetMemoryForTests();
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.doesNotThrow(() => saveHistory([{ start: T0 }], blocked));
  assert.deepEqual(loadHistory(blocked), [{ start: T0 }]);
  assert.equal(checkCallAllowed(loadHistory(blocked), T0 + 5 * S).allowed, false);

  // no storage at all
  resetMemoryForTests();
  saveHistory([{ start: T0 }], null);
  assert.deepEqual(loadHistory(null), [{ start: T0 }]);
  resetMemoryForTests();
});

test("wiring: the UI enforces the limits before starting, and caps duration", () => {
  const src = readFileSync(
    new URL("../src/components/VoiceControls.tsx", import.meta.url),
    "utf8",
  );
  const startFn = src.slice(src.indexOf("async function start()"));

  // the limit check comes first, and a blocked click returns before anything else
  const iCheck = startFn.indexOf("checkCallAllowed(");
  const iReturn = startFn.indexOf("return;", iCheck);
  const iClear = startFn.indexOf("setTranscript([])");
  const iVapi = startFn.indexOf(".start(getVapiAssistantId()");
  assert.ok(iCheck > -1 && iReturn > iCheck, "check then early return");
  assert.ok(iReturn < iClear && iClear < iVapi, "blocked click leaves transcript alone");

  // Vapi is told the cap too, using the shared constant
  assert.match(src, /maxDurationSeconds: MAX_CALL_SECONDS/);
  // the countdown hangs up and explains why
  assert.match(src, /DURATION_LIMIT_MESSAGE/);
  assert.match(src, /void stopRef\.current\(\)/);
  // end-of-call time is recorded so the cooldown starts from the real end
  assert.match(src, /recordCallEnd\(loadHistory\(storage\), Date\.now\(\)\)/);
});
