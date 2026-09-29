// Small illustrative previews for the "How it works" steps. Purely visual: a
// sample lead, no data fetched, nothing connected to Vapi or any backend.
// Each preview animates once when it mounts (the parent remounts it when the
// active step changes).

const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[6.5rem] w-full items-center">{children}</div>;
}

function Tick({ className = "h-3.5 w-3.5" }: { className?: string }) {
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

function Mic({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/* 01: a new enquiry arrives */
function Incoming() {
  return (
    <Frame>
      <div className="ve-rise flex w-full flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-hidden="true">
          <span className="ve-ring absolute h-11 w-11 rounded-full border-2 border-brand-blue" />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-sm font-medium text-white">
            JC
          </div>
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[#1a5fb4]">
            New enquiry
          </p>
          <p className="m-0 mt-0.5 text-[17px] font-semibold leading-tight text-foreground">
            James Carter
          </p>
          <p className="m-0 text-sm text-muted">Dubai Property Enquiry · Google Ads</p>
        </div>
        <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
          Just now
        </span>
      </div>
    </Frame>
  );
}

/* 02: the call */
const WAVE = [28, 46, 34, 62, 48, 78, 58, 92, 70];

function WaveSide({ mirrored }: { mirrored?: boolean }) {
  const hs = mirrored ? [...WAVE].reverse() : WAVE;
  return (
    <div className="flex h-12 items-center gap-[3px]" aria-hidden="true">
      {hs.map((h, i) => (
        <span
          key={i}
          className="ve-bar block w-1 rounded-full"
          style={{
            height: `${h}%`,
            backgroundColor: i % 2 === (mirrored ? 1 : 0) ? "#09c19a" : "#2d9bfe",
            animationDelay: `${((i * 7) % 9) * 0.09}s`,
            animationDuration: `${0.85 + (i % 4) * 0.17}s`,
          }}
        />
      ))}
    </div>
  );
}

function Calling() {
  return (
    <Frame>
      <div className="ve-rise flex w-full flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          <WaveSide />
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden="true">
            <span className="ve-ring absolute h-12 w-12 rounded-full border-2 border-accent" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-accent bg-background text-accent">
              <Mic />
            </div>
          </div>
          <WaveSide mirrored />
        </div>
        <p className="m-0 flex items-center gap-2 text-sm text-foreground">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#0a9d7c]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
          </svg>
          <span className="font-medium">Calling James Carter</span>
          <span className="text-muted">· connected</span>
        </p>
      </div>
    </Frame>
  );
}

/* 03: the answers become fields */
const FIELDS = [
  { label: "Purpose", value: "Investment" },
  { label: "Budget", value: "AED 4M" },
  { label: "Area", value: "Dubai Marina" },
];
function Qualifying() {
  return (
    <Frame>
      <dl className="m-0 grid w-full grid-cols-3">
        {FIELDS.map((f, i) => (
          <div
            key={f.label}
            className="ve-rise border-l border-border pl-4 first:border-l-0 first:pl-0"
            style={rise(i * 380)}
          >
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              {f.label}
              <span className="text-[#0a9d7c]">
                <Tick className="h-3 w-3" />
              </span>
            </dt>
            <dd className="m-0 mt-1 text-[17px] font-semibold leading-snug text-foreground">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}

/* 04: the property match */
function Matching() {
  return (
    <Frame>
      <div className="flex w-full flex-col gap-2.5">
        <p className="ve-rise m-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Matched from your property data
        </p>
        <div className="ve-rise flex flex-wrap items-center gap-x-3 gap-y-2" style={rise(350)}>
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-blue"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <p className="m-0 text-[17px] font-semibold leading-tight text-foreground">
              Marina Tower by Sobha
            </p>
            <p className="m-0 mt-0.5 text-sm text-muted">From AED 3.1M</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800">
            <Tick />
            Within budget
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* 05: follow-up */
const FOLLOW = [
  { label: "Call attempted", when: "10:02", done: true },
  { label: "WhatsApp sent", when: "10:04", done: true },
  { label: "Next call", when: "Tomorrow", done: false },
];
function FollowUp() {
  return (
    <Frame>
      <ol className="relative m-0 grid w-full list-none grid-cols-3 p-0">
        <span aria-hidden="true" className="absolute left-2 right-2 top-[10px] h-px bg-border" />
        {FOLLOW.map((f, i) => (
          <li
            key={f.label}
            className="ve-rise relative flex flex-col items-start gap-1.5 pr-2"
            style={rise(i * 320)}
          >
            <span
              aria-hidden="true"
              className={`relative flex h-5 w-5 items-center justify-center rounded-full ${
                f.done
                  ? "bg-emerald-500 text-white"
                  : "border-2 border-accent bg-background text-accent"
              }`}
            >
              {f.done ? <Tick className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </span>
            <span className="text-sm font-medium leading-tight text-foreground">{f.label}</span>
            <span className="text-xs text-muted">{f.when}</span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/* 06: AI to human */
function Handoff() {
  return (
    <Frame>
      <div className="ve-rise flex w-full flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 flex-col items-center gap-1.5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-accent bg-background text-accent" aria-hidden="true">
              <Mic className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">VoiceEstate AI</span>
          </div>
          <div className="relative h-px min-w-8 flex-1 bg-border" aria-hidden="true">
            <span className="ve-travel absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-[#09c19a]" />
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1.5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </div>
            <span className="text-xs font-medium text-foreground">Human closer</span>
          </div>
        </div>
        <p className="m-0 text-center text-sm text-muted">
          Summary, budget and property match go with the lead
        </p>
      </div>
    </Frame>
  );
}

const VISUALS = [Incoming, Calling, Qualifying, Matching, FollowUp, Handoff];

export default function StepVisual({ index }: { index: number }) {
  const Visual = VISUALS[index] ?? Incoming;
  return <Visual />;
}
