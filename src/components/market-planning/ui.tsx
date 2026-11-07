import type { ReactNode } from "react";
import ui from "./ui.module.css";

/** Evidence classification shown next to numbers. Colour is never the only signal:
 *  each kind has its own icon shape and its own wording. */
export type Evidence = "input" | "client" | "external" | "assumption" | "pending";

const META: Record<Evidence, { label: string; cls: string }> = {
  input: { label: "Your input", cls: ui.pillBlue },
  client: { label: "Client benchmark", cls: ui.pillGreen },
  external: { label: "External research", cls: ui.pillSlate },
  assumption: { label: "Your own figure", cls: ui.pillAmber },
  pending: { label: "Research pending", cls: ui.pillDashed },
};

function Icon({ kind }: { kind: Evidence }) {
  const p = {
    width: 13,
    height: 13,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (kind) {
    case "input":
      return (
        <svg {...p}>
          <path d="M3 13l.6-2.6 7-7a1.4 1.4 0 0 1 2 0l.1.1a1.4 1.4 0 0 1 0 2l-7 7L3 13z" />
        </svg>
      );
    case "client":
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.2 8.2l2 2 3.6-4.2" />
        </svg>
      );
    case "external":
      return (
        <svg {...p}>
          <path d="M8 4.2C6.8 3.3 5 3 2.5 3v8.6c2.5 0 4.3.3 5.5 1.2 1.2-.9 3-1.2 5.5-1.2V3c-2.5 0-4.3.3-5.5 1.2z" />
          <path d="M8 4.2v8.6" />
        </svg>
      );
    case "assumption":
      return (
        <svg {...p}>
          <path d="M2.5 5h11M2.5 11h11" />
          <circle cx="10" cy="5" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="6" cy="11" r="1.7" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.25" strokeDasharray="2.4 2.4" />
          <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function EvidencePill({ kind, label }: { kind: Evidence; label?: string }) {
  const m = META[kind];
  return (
    <span className={`${ui.pill} ${m.cls}`}>
      <Icon kind={kind} />
      {label ?? m.label}
    </span>
  );
}

export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.2V11M8 5v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PanelHead({
  id,
  step,
  title,
  copy,
  right,
}: {
  id?: string;
  step?: string;
  title: string;
  copy?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className={ui.panelHead}>
      <div className={ui.panelHeadRow}>
        <div>
          {step ? <p className={ui.step}>{step}</p> : null}
          <h2 id={id} className={ui.h2}>{title}</h2>
        </div>
        {right}
      </div>
      {copy ? <p className={ui.copy}>{copy}</p> : null}
    </div>
  );
}
