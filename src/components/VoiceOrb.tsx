type Status = "ready" | "connecting" | "active" | "ended";

const CAPTION: Record<Status, string> = {
  ready: "Ready when you are",
  connecting: "Connecting…",
  active: "Live — listening and speaking",
  ended: "Call ended",
};

const SIDE = 14; // bars per side, outermost to innermost
const PHONE_FROM = 6; // on phones only the inner bars show

// A voice-like envelope: bars rise toward the orb. Deterministic, so the server
// and the browser render the same thing.
function barHeight(pos: number): number {
  const env = Math.pow((pos + 1) / SIDE, 1.1);
  const jitter = 0.6 + 0.4 * Math.abs(Math.sin(pos * 2.3 + 1));
  return Math.max(14, Math.round(100 * env * jitter));
}

// The logo's two colors while live (blue outside, teal by the orb); quiet gray
// when the call isn't running.
function barColor(pos: number, live: boolean, connecting: boolean): string {
  if (!live) return connecting ? "#a9cdf5" : "#d5dbe3";
  const t = pos / (SIDE - 1);
  const from = [45, 155, 254];
  const to = [9, 193, 154];
  const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function WaveSide({
  mirrored,
  live,
  connecting,
}: {
  mirrored?: boolean;
  live: boolean;
  connecting: boolean;
}) {
  const order = Array.from({ length: SIDE }, (_, i) => (mirrored ? SIDE - 1 - i : i));
  return (
    <div className="flex h-16 items-center gap-[5px]" aria-hidden="true">
      {order.map((pos) => (
        <span
          key={pos}
          className={`w-1 rounded-full transition-colors duration-500 ${
            live ? "ve-bar" : ""
          } ${pos < PHONE_FROM ? "hidden sm:block" : "block"}`}
          style={{
            height: `${barHeight(pos)}%`,
            backgroundColor: barColor(pos, live, connecting),
            animationDelay: live ? `${((pos * 7) % 9) * 0.09}s` : undefined,
            animationDuration: live ? `${0.9 + (pos % 5) * 0.16}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceOrb({ status }: { status: Status }) {
  const active = status === "active";
  const connecting = status === "connecting";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <WaveSide live={active} connecting={connecting} />

        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          {active && (
            <>
              <span className="ve-ring absolute h-16 w-16 rounded-full border-2 border-accent" />
              <span
                className="ve-ring absolute h-16 w-16 rounded-full border-2 border-brand-blue"
                style={{ animationDelay: "1.2s" }}
              />
            </>
          )}
          {connecting && (
            <span className="ve-pulse absolute h-16 w-16 rounded-full border-2 border-brand-blue" />
          )}

          <div
            className={`relative flex h-16 w-16 items-center justify-center rounded-full border bg-background transition-colors duration-500 ${
              active
                ? "border-accent text-accent"
                : connecting
                  ? "border-brand-blue text-brand-blue"
                  : "border-border text-muted"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </div>
        </div>

        <WaveSide mirrored live={active} connecting={connecting} />
      </div>
      <p className="m-0 text-sm text-muted">{CAPTION[status]}</p>
    </div>
  );
}
