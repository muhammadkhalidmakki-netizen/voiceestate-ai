"use client";

import { useEffect } from "react";

const DURATION_MS = 550;

// Eased scroll driven by us (not by the browser's smooth-scroll), so it behaves
// the same everywhere and always lands exactly on the target. Stops at once if
// the visitor scrolls, taps or presses a key.
function scrollToY(targetY: number) {
  const startY = window.scrollY;
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const endY = Math.max(0, Math.min(targetY, maxY));
  if (Math.abs(endY - startY) < 2) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, endY);
    return;
  }

  const t0 = performance.now();
  let cancelled = false;
  const events = ["wheel", "touchstart", "keydown", "mousedown"] as const;
  const stop = () => {
    cancelled = true;
    events.forEach((ev) => window.removeEventListener(ev, stop));
  };
  events.forEach((ev) => window.addEventListener(ev, stop, { passive: true }));

  const tick = () => {
    if (cancelled) return;
    const p = Math.min(1, (performance.now() - t0) / DURATION_MS);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out
    window.scrollTo(0, startY + (endY - startY) * eased);
    if (p < 1) setTimeout(tick, 16);
    else stop();
  };
  tick();
}

// Makes in-page "#section" links scroll EVERY time they are clicked.
//
// Without this, once the URL already ends in "#how-it-works", clicking the same
// link again does nothing (Next.js sees "same URL" and skips the scroll), so a
// visitor who scrolled up a little can't jump back. This listens for clicks on
// any same-page hash link whose target exists, scrolls to it itself, and keeps
// the URL hash in sync. Links to sections that don't exist yet are left alone.
export default function HashScroll() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab etc.

      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;

      const id = decodeURIComponent((link.getAttribute("href") ?? "").slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      e.preventDefault(); // stops both the browser jump and Next's own handling
      const marginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      scrollToY(target.getBoundingClientRect().top + window.scrollY - marginTop);
      if (window.location.hash !== `#${id}`) {
        window.history.pushState(null, "", `#${id}`);
      }
    }

    // capture phase: runs before React/Next see the click
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
