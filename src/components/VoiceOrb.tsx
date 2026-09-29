type Status = "ready" | "connecting" | "active" | "ended";

const CAPTION: Record<Status, string> = {
  ready: "Ready when you are",
  connecting: "Connecting…",
  active: "Live — listening and speaking",
  ended: "Call ended",
};

const BAR_DELAYS = ["0s", "0.15s", "0.3s", "0.1s", "0.25s"];

export default function VoiceOrb({ status }: { status: Status }) {
  const active = status === "active";
  const connecting = status === "connecting";

  return (
    <div className="flex flex-col items-center gap-3 border-b border-border py-6">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {active && (
          <>
            <span className="ve-ring absolute h-14 w-14 rounded-full border-2 border-accent" />
            <span
              className="ve-ring absolute h-14 w-14 rounded-full border-2 border-brand-blue"
              style={{ animationDelay: "1.2s" }}
            />
          </>
        )}
        {connecting && (
          <span className="ve-pulse absolute h-14 w-14 rounded-full border-2 border-brand-blue" />
        )}

        <div
          className={`relative flex h-14 w-14 items-center justify-center rounded-full border bg-background ${
            active
              ? "border-accent text-accent"
              : connecting
                ? "border-brand-blue text-brand-blue"
                : "border-border text-muted"
          }`}
        >
          {active ? (
            <div className="flex h-6 items-center gap-[3px]" aria-hidden="true">
              {BAR_DELAYS.map((delay, i) => (
                <span
                  key={i}
                  className="ve-bar block h-full w-[3px] rounded-full bg-accent"
                  style={{ animationDelay: delay }}
                />
              ))}
            </div>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </div>
      </div>
      <p className="text-sm text-muted">{CAPTION[status]}</p>
    </div>
  );
}
