"use client";

import { useEffect } from "react";
import { isKnownNormalEndLog } from "../lib/devConsoleFilter";

// Development only. Skips exactly one known-normal Daily end-of-call log so the
// Next.js dev overlay doesn't report it as an issue. Everything else, including
// genuine Daily/Vapi errors, is passed straight through to console.error.
//
// Runs in an effect on purpose: it must wrap console.error AFTER Next's dev
// overlay has installed its own hook, so a skipped message never reaches it.
export default function DevConsoleFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const previous = console.error;
    const filtered = (...args: unknown[]) => {
      if (isKnownNormalEndLog(args)) return;
      previous.apply(console, args);
    };
    console.error = filtered;

    return () => {
      if (console.error === filtered) console.error = previous;
    };
  }, []);

  return null;
}
