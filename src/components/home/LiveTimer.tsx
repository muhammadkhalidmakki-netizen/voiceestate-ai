"use client";

import { useEffect, useState } from "react";

// Purely visual: counts up like a call in progress so the sample panel feels
// live. It starts from the same value on the server and the first client render
// (no hydration mismatch), then ticks once a second. Loops well inside a
// typical demo-call length.
const START_SECONDS = 84; // 1:24
const LOOP_AT = 179;
const LOOP_TO = 45;

function clock(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function LiveTimer() {
  const [seconds, setSeconds] = useState(START_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s >= LOOP_AT ? LOOP_TO : s + 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="tabular-nums">{clock(seconds)}</span>;
}
