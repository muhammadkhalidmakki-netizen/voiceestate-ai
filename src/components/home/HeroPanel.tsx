import LiveTimer from "./LiveTimer";

// A sample live call: the voice conversation on top, what the system understood
// from it underneath. Sanitized sample lead; nothing here is fetched and no call
// is made. The animation reuses the /demo voice classes (ve-bar, ve-ring,
// ve-pulse), so it moves the same way the real demo does.

const LEAD = { name: "James Carter", title: "Dubai Property Enquiry" };

const CAPTURED = [
  { label: "Purpose", value: "Investment" },
  { label: "Budget", value: "AED 4M" },
  { label: "Area", value: "Dubai Marina" },
];

const STEPS = [
  { label: "Qualified", done: true },
  { label: "CRM updated", done: true },
  { label: "Human closer", done: false },
];

// Bar heights (% of the waveform height) rising toward the centre orb, like a
// voice envelope. One side is mirrored for the other.
const SIDE_HEIGHTS = [18, 32, 24, 44, 36, 58, 48, 70, 56, 84, 96];

// Blue on the outside easing to teal by the orb: the logo's two colors.
function barColor(i: number, total: number): string {
  const t = i / (total - 1);
  const from = [45, 155, 254];
  const to = [9, 193, 154];
  const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function Bars({ mirrored }: { mirrored?: boolean }) {
  const heights = mirrored ? [...SIDE_HEIGHTS].reverse() : SIDE_HEIGHTS;
  return (
    <div className="flex h-16 items-center gap-[3px]" aria-hidden="true">
      {heights.map((h, i) => {
        const pos = mirrored ? heights.length - 1 - i : i;
        return (
          <span
            key={i}
            className="ve-bar block w-1 rounded-full"
            style={{
              height: `${h}%`,
              backgroundColor: barColor(pos, SIDE_HEIGHTS.length),
              animationDelay: `${((pos * 7) % 10) * 0.09}s`,
              animationDuration: `${0.85 + (pos % 4) * 0.17}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function Check({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </p>
  );
}

export default function HeroPanel() {
  return (
    <figure
      aria-label="Example of a live VoiceEstate AI call with a sample lead"
      className="m-0 w-full max-w-[32rem] overflow-hidden rounded-2xl border border-border bg-background shadow-[0_12px_40px_-14px_rgba(11,18,32,0.16)]"
    >
      {/* who is on the line */}
      <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-4">
        <div className="min-w-0">
          <p className="m-0 truncate text-[19px] font-semibold leading-tight tracking-tight text-foreground">
            {LEAD.name}
          </p>
          <p className="m-0 mt-0.5 text-sm text-muted">{LEAD.title}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="ve-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* the voice call: the focal point */}
      <div className="px-6 pb-1 pt-1">
        <div className="flex items-center justify-center gap-3">
          <Bars />
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center" aria-hidden="true">
            <span className="ve-ring absolute h-14 w-14 rounded-full border-2 border-accent" />
            <span
              className="ve-ring absolute h-14 w-14 rounded-full border-2 border-brand-blue"
              style={{ animationDelay: "1.2s" }}
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-accent bg-background text-accent">
              <svg
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
            </div>
          </div>
          <Bars mirrored />
        </div>

        <p className="m-0 mt-1.5 flex items-center justify-center gap-2 text-sm text-muted">
          <span>Call in progress</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-border" />
          <span className="font-medium text-foreground">
            <LiveTimer />
          </span>
        </p>
      </div>

      {/* what is being said, out loud */}
      <div className="flex flex-col gap-3 px-6 pb-5 pt-3">
        <div className="flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-2 px-1 text-xs font-medium text-muted">
            VoiceEstate AI
            <span className="flex h-3 items-center gap-[2px]" aria-hidden="true">
              {[0, 0.15, 0.3].map((d) => (
                <span
                  key={d}
                  className="ve-bar block h-full w-[2px] rounded-full bg-accent"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </span>
          </span>
          <p className="m-0 max-w-[90%] rounded-2xl border border-border bg-surface px-4 py-2 text-[15px] leading-relaxed text-foreground">
            Thanks for picking up, James. Is this for investment or a home for
            yourself?
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="px-1 text-xs font-medium text-muted">James</span>
          <p className="m-0 max-w-[90%] rounded-2xl bg-foreground px-4 py-2 text-[15px] leading-relaxed text-white">
            Investment. Around four million dirhams, ideally Dubai Marina.
          </p>
        </div>
      </div>

      {/* what the system took from it (hairlines instead of boxes) */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="whitespace-nowrap">
            <SectionLabel>Understood from the call</SectionLabel>
          </span>
          <span className="text-xs text-muted">Sample lead, for illustration</span>
        </div>
        <dl className="m-0 mt-2.5 grid grid-cols-3">
          {CAPTURED.map((c) => (
            <div
              key={c.label}
              className="border-l border-border pl-4 first:border-l-0 first:pl-0"
            >
              <dt className="text-xs text-muted">{c.label}</dt>
              <dd className="m-0 mt-0.5 text-[17px] font-semibold leading-snug text-foreground">
                {c.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-t border-border px-6 py-4">
        <SectionLabel>Property match</SectionLabel>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-blue"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p className="m-0 text-[17px] font-semibold leading-tight text-foreground">
              Marina Tower by Sobha
            </p>
            <p className="m-0 mt-0.5 text-sm text-muted">From AED 3.1M</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-emerald-800">
            <Check className="h-3.5 w-3.5" />
            Within budget
          </span>
        </div>
      </div>

      {/* what happens next */}
      <div className="border-t border-border px-6 pb-4 pt-4">
        <ol className="m-0 grid list-none grid-cols-3 p-0">
          {STEPS.map((s, i) => (
            <li
              key={s.label}
              className="relative flex flex-col items-center gap-1.5 px-1 text-center"
            >
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-[11px] h-px w-full bg-emerald-300"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative flex h-[22px] w-[22px] items-center justify-center rounded-full ${
                  s.done
                    ? "bg-emerald-500 text-white"
                    : "border-2 border-accent bg-background text-accent"
                }`}
              >
                {s.done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </span>
              <span
                className={`text-[13px] leading-tight text-foreground sm:text-sm ${
                  s.done ? "font-medium" : "font-semibold"
                }`}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
