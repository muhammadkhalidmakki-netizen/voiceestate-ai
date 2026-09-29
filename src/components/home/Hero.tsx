import { Fragment } from "react";
import Link from "next/link";
import HeroPanel from "./HeroPanel";

const FLOW = [
  "Lead comes in",
  "AI calls",
  "Qualifies",
  "Property match",
  "Human closer",
];

const STACK = ["AssemblyAI", "GPT-4o", "ElevenLabs", "Vapi", "Twilio"];

const microLabel =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted";

export default function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-8">
      <div className="max-w-[34rem]">
        <p className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-xs sm:tracking-[0.14em]">
          <span aria-hidden="true" className="hidden h-px w-8 bg-[#0a9d7c] sm:block" />
          AI voice sales agent for real estate
        </p>

        <h1 className="m-0 text-[2.5rem] font-[650] leading-[1.03] tracking-[-0.035em] text-foreground sm:text-[3rem] lg:text-[3.4rem]">
          Your sales team shouldn&rsquo;t have to call every lead.
        </h1>

        <p className="mt-6 max-w-[30rem] text-xl leading-[1.55] text-foreground">
          VoiceEstate AI calls, qualifies, matches the right property, and keeps
          following up &mdash; so your team can focus on serious buyers.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/demo"
            className="group inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#1f7ae0] to-[#0a9d7c] px-6 py-3 text-[15px] font-medium text-white transition-[filter] hover:brightness-95"
          >
            Talk to VoiceEstate AI
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
          <Link
            href="#how-it-works"
            className="group inline-flex items-center gap-1.5 py-3 text-[15px] font-medium text-foreground underline-offset-4 hover:underline"
          >
            See How It Works
            <span
              aria-hidden="true"
              className="transition-transform group-hover:translate-y-0.5"
            >
              ↓
            </span>
          </Link>
        </div>

        <div className="mt-12">
          <p className={`${microLabel} mb-3 flex items-center gap-2`}>
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="ve-pulse absolute inline-flex h-full w-full rounded-full bg-accent/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Live workflow
          </p>
          {/* desktop: a stepper, labels under a connecting line */}
          <ol className="relative m-0 hidden list-none grid-cols-5 p-0 lg:grid">
            <span
              aria-hidden="true"
              className="absolute left-0 right-2 top-[3px] h-px bg-border"
            />
            {FLOW.map((step, i) => (
              <li key={step} className="relative flex flex-col items-start gap-2.5 pr-2">
                <span
                  aria-hidden="true"
                  className="ve-flow-dot relative h-[7px] w-[7px] rounded-full bg-[#cbd5e1]"
                  style={{ animationDelay: `${i * 2}s` }}
                />
                <span
                  className="ve-flow-label text-balance text-[13.5px] font-medium leading-tight text-muted"
                  style={{ animationDelay: `${i * 2}s` }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>

          {/* smaller screens: the same steps as one wrapping line */}
          <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 gap-y-2 p-0 text-[14px] lg:hidden">
            {FLOW.map((step, i) => (
              <Fragment key={step}>
                {i > 0 && (
                  <li aria-hidden="true" className="text-xs text-muted/50">
                    →
                  </li>
                )}
                <li className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    aria-hidden="true"
                    className="ve-flow-dot h-1.5 w-1.5 rounded-full bg-[#cbd5e1]"
                    style={{ animationDelay: `${i * 2}s` }}
                  />
                  <span
                    className="ve-flow-label font-medium text-muted"
                    style={{ animationDelay: `${i * 2}s` }}
                  >
                    {step}
                  </span>
                </li>
              </Fragment>
            ))}
          </ol>
        </div>

        <div className="mt-10">
          <p className={`${microLabel} mb-1.5`}>Voice intelligence</p>
          <p className="m-0 text-[15px] font-medium text-foreground">
            Powered by AssemblyAI Universal 3.5 Pro
          </p>
          <p className="m-0 mt-1 text-xs text-muted">{STACK.join(" · ")}</p>
        </div>
      </div>

      <div className="flex justify-center lg:justify-end">
        <HeroPanel />
      </div>
    </section>
  );
}
