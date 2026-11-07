"use client";

import { useEffect, useRef } from "react";
import { usePlanner } from "./planner-context";
import { DetailBody, detailTitle } from "./DetailContent";
import d from "./drawer.module.css";

/** Side panel for country, metric and channel details. Opening it never changes the scenario. */
export default function DetailDrawer() {
  const { detail, closeDetail, rows } = usePlanner();
  const open = detail !== null;
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeDetail();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener.current?.focus?.();
    };
  }, [open, closeDetail]);

  if (!detail) return null;
  const title = detailTitle(detail, rows);

  return (
    <div className={d.layer}>
      <div className={d.scrim} onClick={closeDetail} aria-hidden="true" />
      <aside ref={panel} className={d.drawer} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className={d.head}>
          <h2 id="drawer-title" className={d.title}>
            {title}
          </h2>
          <button ref={closeBtn} type="button" className={d.close} onClick={closeDetail} aria-label="Close details">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={d.body}>
          <DetailBody detail={detail} />
        </div>
      </aside>
    </div>
  );
}
