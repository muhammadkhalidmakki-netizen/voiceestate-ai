// MASTER SWITCH for the live voice demo.
//   true  = visitors can start a Vapi call (normal).
//   false = calling is turned off: no Vapi client is created, the Call button
//           is disabled and the page shows "temporarily unavailable".
//
// Flip it with `npm run demo:off` / `npm run demo:on`, then commit and push
// (the Cloudflare build picks it up). Nothing else needs to change.
export const DEMO_ENABLED = false;
