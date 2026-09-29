"use client";

import { useEffect, useRef, useState } from "react";
import StepVisual from "./StepVisuals";

type Step = { title: string; text: string };

// The logo's two colors, blue easing to teal along the steps.
function dotColor(i: number, total: number): string {
  const t = i / (total - 1);
  const from = [45, 155, 254];
  const to = [9, 193, 154];
  const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Same scroll-reveal as before (driven by the InView wrapper's data-state).
const reveal =
  "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none group-data-[state=armed]:translate-y-3 group-data-[state=armed]:opacity-0";

const AUTOPLAY_MS = 3800;

export default function StepsExplorer({ steps }: { steps: Step[] }) {
  const last = steps.length - 1;
  const [active, setActive] = useState(0);
  const interacted = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function choose(i: number) {
    interacted.current = true; // any hover, tap or focus ends the autoplay for good
    setActive(i);
  }

  // Gentle autoplay on desktop only, while the section is on screen and until
  // the visitor touches it. Off for reduced motion and on phones (where the
  // preview opens inline and would push the page around).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        stop();
        if (entry.isIntersecting && !interacted.current) {
          timer = setInterval(() => {
            if (interacted.current) return stop();
            setActive((a) => (a + 1) % steps.length);
          }, AUTOPLAY_MS);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(root);
    return () => {
      stop();
      io.disconnect();
    };
  }, [steps.length]);

  // Where the caret under the row points: the left edge of the active column.
  const colGap = "1.75rem";
  const caretLeft = `calc((100% - 5 * ${colGap}) / 6 * ${active} + ${active} * ${colGap} + 1.25rem)`;

  return (
    <div ref={rootRef}>
      <ol className="relative m-0 mt-14 grid list-none grid-cols-1 gap-9 p-0 sm:mt-16 lg:grid-cols-6 lg:gap-7">
        {/* mobile: vertical rail */}
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-[3px] top-2 w-px bg-border lg:hidden"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-[3px] top-2 w-px origin-top bg-linear-to-b from-[#2d9bfe] to-[#09c19a] transition-transform duration-[1600ms] ease-out motion-reduce:transition-none group-data-[state=armed]:scale-y-0 lg:hidden"
        />
        {/* desktop: horizontal line */}
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-[3px] hidden h-px bg-border lg:block"
        />
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-[3px] hidden h-px origin-left bg-linear-to-r from-[#2d9bfe] to-[#09c19a] transition-transform duration-[1600ms] ease-out motion-reduce:transition-none group-data-[state=armed]:scale-x-0 lg:block"
        />

        {steps.map((s, i) => {
          const isActive = i === active;
          const isHuman = i === last;
          return (
            <li
              key={s.title}
              className={`relative pl-9 lg:pl-0 lg:pt-9 ${reveal}`}
              style={{ transitionDelay: `${150 + i * 130}ms` }}
            >
              {/* the selected segment on the line (desktop) */}
              <span
                aria-hidden="true"
                className={`absolute left-0 right-3 top-[2px] hidden h-[3px] rounded-full bg-[#09c19a] transition-opacity duration-300 lg:block ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
              <span
                aria-hidden="true"
                className={`absolute left-0 top-[5px] rounded-full transition-all duration-300 lg:top-0 ${
                  isHuman
                    ? "-ml-px -mt-px h-[9px] w-[9px] border-2 border-[#09c19a] bg-background"
                    : "h-[7px] w-[7px]"
                } ${isActive ? "scale-[1.6] ring-4 ring-[#09c19a]/20" : ""}`}
                style={isHuman ? undefined : { backgroundColor: dotColor(i, steps.length) }}
              />

              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                onMouseEnter={() => choose(i)}
                onFocus={() => choose(i)}
                onClick={() => choose(i)}
                className="block w-full cursor-pointer rounded-md text-left focus-visible:outline-offset-4"
              >
                <span
                  className={`mb-1.5 block text-xs font-semibold tracking-[0.14em] transition-colors duration-300 ${
                    isActive ? "text-[#067a63]" : "text-[#0a9d7c]/70"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`block text-[17px] font-semibold leading-snug transition-colors duration-300 ${
                    isActive ? "text-[#067a63]" : "text-foreground/70"
                  }`}
                >
                  {s.title}
                </span>
                <span
                  className={`mt-1.5 block text-[14.5px] leading-relaxed transition-colors duration-300 ${
                    isActive ? "text-foreground" : "text-muted/75"
                  }`}
                >
                  {s.text}
                </span>
              </button>

              {/* phones: the preview opens right under the tapped step */}
              {isActive && (
                <div
                  key={`m-${i}`}
                  className="ve-rise mt-4 rounded-xl border border-border bg-background px-4 py-3 lg:hidden"
                >
                  <StepVisual index={i} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* desktop: one preview panel that follows the active step */}
      <div
        className={`relative mt-10 hidden lg:block ${reveal}`}
        style={{ transitionDelay: "950ms" }}
      >
        <span
          aria-hidden="true"
          className="absolute -top-[7px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-l border-t border-border bg-background transition-[left] duration-500 ease-out"
          style={{ left: caretLeft }}
        />
        <div
          aria-live="polite"
          className="rounded-2xl border border-border bg-background px-8 py-6 shadow-[0_10px_36px_-16px_rgba(11,18,32,0.14)]"
        >
          <div key={active} className="mx-auto max-w-[34rem]">
            <StepVisual index={active} />
          </div>
          <p className="m-0 mt-2 text-right text-xs text-muted">
            Illustrative preview with sample data
          </p>
        </div>
      </div>
    </div>
  );
}
