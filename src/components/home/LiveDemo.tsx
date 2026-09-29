import Link from "next/link";
import InView from "./InView";

// Same scroll-reveal as the other homepage sections (driven by InView).
const reveal =
  "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none group-data-[state=armed]:translate-y-3 group-data-[state=armed]:opacity-0";

// What the assistant is "listening for", lighting up in turn. Illustrative
// only: nothing here starts a call. The real interaction lives on /demo.
const HINTS = ["Investment", "AED 4M", "Dubai Marina", "Property match"];

const SIDE = 24; // bars per side; the outer ones are hidden on phones
const PHONE_FROM = 15; // on phones only bars at or after this position show

// Bar height rises toward the centre orb, with a fixed irregularity so it reads
// as a voice envelope. Deterministic, so server and client render the same.
function barHeight(pos: number): number {
  const env = Math.pow((pos + 1) / SIDE, 1.15);
  const jitter = 0.62 + 0.38 * Math.abs(Math.sin(pos * 2.3 + 1));
  return Math.max(12, Math.round(100 * env * jitter));
}

// The logo's two colors: blue on the outside easing to teal by the orb.
function barColor(pos: number): string {
  const t = pos / (SIDE - 1);
  const from = [45, 155, 254];
  const to = [9, 193, 154];
  const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function Wave({ mirrored }: { mirrored?: boolean }) {
  // positions run outer (0) to inner (SIDE-1); the right side is the mirror
  const order = Array.from({ length: SIDE }, (_, i) => (mirrored ? SIDE - 1 - i : i));
  return (
    <div className="flex h-28 items-center gap-[6px]" aria-hidden="true">
      {order.map((pos) => (
        <span
          key={pos}
          className={`ve-bar w-[5px] rounded-full ${pos < PHONE_FROM ? "hidden sm:block" : "block"}`}
          style={{
            height: `${barHeight(pos)}%`,
            backgroundColor: barColor(pos),
            animationDelay: `${((pos * 7) % 11) * 0.08}s`,
            animationDuration: `${0.9 + (pos % 5) * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LiveDemo() {
  return (
    <section
      id="live-demo"
      className="flex min-h-[calc(100vh-5rem)] scroll-mt-32 items-center border-y md:scroll-mt-20 border-border bg-surface"
    >
      <InView className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-24">
        {/* heading */}
        <div className={reveal}>
          <p className="mb-5 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-xs sm:tracking-[0.14em]">
            <span aria-hidden="true" className="hidden h-px w-8 bg-[#0a9d7c] sm:block" />
            Live demo
            <span aria-hidden="true" className="hidden h-px w-8 bg-[#0a9d7c] sm:block" />
          </p>
          <h2 className="mx-auto m-0 max-w-[20ch] text-[2.1rem] font-[650] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[3rem] lg:text-[3.4rem]">
            Hear how VoiceEstate AI handles a real property enquiry.
          </h2>
          <p className="mx-auto m-0 mt-6 max-w-[34rem] text-lg leading-relaxed text-foreground">
            Talk to the same AI voice experience built for lead qualification,
            property matching, and sales follow-up.
          </p>
        </div>

        {/* the voice: waveform around a microphone */}
        <div
          className={`mt-12 flex items-center justify-center gap-3 sm:mt-14 sm:gap-4 ${reveal}`}
          style={{ transitionDelay: "150ms" }}
        >
          <Wave />
          <div
            className="relative flex h-24 w-24 shrink-0 items-center justify-center sm:h-32 sm:w-32"
            aria-hidden="true"
          >
            <span className="ve-ring absolute h-20 w-20 rounded-full border-2 border-accent sm:h-[5.5rem] sm:w-[5.5rem]" />
            <span
              className="ve-ring absolute h-20 w-20 rounded-full border-2 border-brand-blue sm:h-[5.5rem] sm:w-[5.5rem]"
              style={{ animationDelay: "1.2s" }}
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent bg-background text-accent sm:h-[5.5rem] sm:w-[5.5rem]">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 sm:h-9 sm:w-9"
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
          <Wave mirrored />
        </div>

        {/* what it listens for */}
        <div
          className={`mt-8 flex flex-col items-center gap-3 ${reveal}`}
          style={{ transitionDelay: "280ms" }}
        >
          <p className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="ve-pulse absolute inline-flex h-full w-full rounded-full bg-accent/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Listening for
          </p>
          <ul className="m-0 flex list-none flex-wrap justify-center gap-2.5 p-0">
            {HINTS.map((h, i) => (
              <li
                key={h}
                className="ve-chip rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-muted"
                style={{ animationDelay: `${i * 2}s` }}
              >
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* the call to action */}
        <div
          className={`mt-11 flex flex-col items-center gap-3 sm:mt-12 ${reveal}`}
          style={{ transitionDelay: "410ms" }}
        >
          <Link
            href="/demo"
            className="group inline-flex items-center gap-2.5 rounded-full bg-linear-to-r from-[#1f7ae0] to-[#0a9d7c] px-8 py-4 text-base font-medium text-white transition-[filter] hover:brightness-95"
          >
            Try the Live Demo
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
          <p className="m-0 text-sm text-muted">No signup required</p>
        </div>
      </InView>
    </section>
  );
}
