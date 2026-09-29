"use client";

import { useEffect, useRef, useState } from "react";

// Reveal-on-scroll helper. The content is visible by default (server render,
// no JavaScript, reduced motion, or already on screen when the page loads). Only
// content that starts below the fold is briefly "armed" (hidden) and then
// animates in once, when it scrolls into view.
//
// Children style themselves with group-data variants, e.g.
//   group-data-[state=armed]:opacity-0
type State = "idle" | "armed" | "in";

export default function InView({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    // already visible on load: leave it as is, no animation
    if (el.getBoundingClientRect().top < window.innerHeight * 0.8) return;

    setState("armed");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-state={state} className={`group ${className}`}>
      {children}
    </div>
  );
}
