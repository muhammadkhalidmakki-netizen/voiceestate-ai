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
      className="mt-2 border-t border-border pt-5"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        AI Call Summary
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-foreground">
        {data.summary}
      </p>
      <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-y-1.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-muted">{r.label}</dt>
            <dd className="flex items-center gap-2 font-medium text-foreground">
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
