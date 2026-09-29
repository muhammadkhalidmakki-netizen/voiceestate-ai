// Daily (the audio/video layer under Vapi) logs this line with console.error
// every time a call ends normally: Vapi deletes the room, Daily "ejects" the
// browser. In `next dev` that turns into a red "1 Issue" overlay.
//
// This matcher recognises ONLY that one exact, known-normal message so a
// dev-only wrapper can skip it. Anything else (including Daily's
// "Meeting ended in error: ..." and every genuine Daily/Vapi failure) must
// still reach console.error untouched.
//
// No relative imports, so it can be tested directly with `node --test`.

export const KNOWN_NORMAL_END_LOG =
  "Meeting ended due to ejection: Meeting has ended";

export function isKnownNormalEndLog(args: readonly unknown[]): boolean {
  if (args.length === 0) return false;
  // Only plain strings; an Error object or anything structured is not ours.
  if (!args.every((a) => typeof a === "string")) return false;
  const text = (args as string[]).join(" ").replace(/\s+/g, " ").trim();
  return text === KNOWN_NORMAL_END_LOG;
}
