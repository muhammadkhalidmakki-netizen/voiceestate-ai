import type { CallSummary as CallSummaryData } from "../lib/callSummary";
import type { LeadStage } from "../lib/qualification";
import { STAGE_STYLE } from "./LeadCard";

export default function CallSummary({
  data,
  stage,
}: {
  data: CallSummaryData;
  stage: LeadStage;
}) {
  const rows = [
    { label: "Outcome", value: data.outcome, dot: STAGE_STYLE[stage].dot },
    { label: "Next step", value: data.nextStep },
    { label: "Project", value: data.project },
  ];

  return (
    <section
      aria-label="AI call summary"
      className="ve-rise mt-2 rounded-2xl border border-border bg-surface px-5 py-4"
    >
      <p className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
        AI Call Summary
      </p>
      <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-foreground">
        {data.summary}
      </p>
      <dl className="m-0 mt-3.5 grid grid-cols-[5.5rem_1fr] gap-y-2 border-t border-border pt-3.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="m-0 flex items-center gap-2 font-semibold text-foreground">
              {r.dot && (
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${r.dot}`}
                />
              )}
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
