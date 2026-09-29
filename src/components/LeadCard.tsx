import { DEMO_LEAD } from "../lib/demoLead";
import {
  NOT_PROVIDED,
  type LeadStage,
  type Qualification,
} from "../lib/qualification";

const CONTACT = [
  { label: "Email", value: DEMO_LEAD.email },
  { label: "Phone", value: DEMO_LEAD.phone },
];

// Full class strings (not built dynamically) so Tailwind keeps them.
export const STAGE_STYLE: Record<LeadStage, { pill: string; dot: string }> = {
  "New Lead": {
    pill: "border-blue-300 bg-blue-50 text-blue-800",
    dot: "bg-blue-500",
  },
  Qualified: {
    pill: "border-emerald-300 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  "Follow-up": {
    pill: "border-amber-300 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  "Not Interested": {
    pill: "border-gray-300 bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
  "Junk · Job Enquiry": {
    pill: "border-slate-300 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  "Wrong Number": {
    pill: "border-rose-300 bg-rose-50 text-rose-800",
    dot: "bg-rose-500",
  },
};

function Tick() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-[#0a9d7c]"
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

const sectionLabel =
  "m-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted";

export default function LeadCard({
  qualification,
  stage,
}: {
  qualification: Qualification;
  stage: LeadStage;
}) {
  const stageStyle = STAGE_STYLE[stage];
  const details = [
    { label: "Budget", value: qualification.budget },
    { label: "Purpose", value: qualification.purpose },
    { label: "Property", value: qualification.property },
    { label: "Preferred Area", value: qualification.preferredArea },
  ];
  const captured = details.filter((d) => d.value !== NOT_PROVIDED).length;
  const initials = DEMO_LEAD.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <aside
      aria-label="Lead profile"
      className="self-start rounded-2xl border border-border bg-background lg:sticky lg:top-6"
    >
      {/* who is on the line */}
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-lg font-medium text-white"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[1.65rem] font-semibold leading-tight tracking-tight text-foreground">
              {DEMO_LEAD.name}
            </h1>
            <p className="m-0 mt-0.5 text-[15px] text-muted">{DEMO_LEAD.title}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[15px] font-medium transition-colors duration-500 ${stageStyle.pill}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${stageStyle.dot}`}
            />
            {stage}
          </span>
          <span className="text-sm text-muted">Source · {DEMO_LEAD.source}</span>
        </div>
      </div>

      {/* what the call has learned so far */}
      <div className="border-t border-border px-6 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className={sectionLabel}>Live qualification</p>
          <p className="m-0 text-xs tabular-nums text-muted">
            {captured} of {details.length} captured
          </p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
          {details.map((d) => (
            <span
              key={d.label}
              className={`h-1 rounded-full transition-colors duration-500 ${
                d.value !== NOT_PROVIDED ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>

        <dl className="m-0 mt-2">
          {details.map((d) => {
            const provided = d.value !== NOT_PROVIDED;
            return (
              <div
                key={d.label}
                className={`flex justify-between gap-x-4 gap-y-0.5 border-b border-border py-3 last:border-b-0 ${
                  d.value.length > 24
                    ? "flex-col items-start"
                    : "flex-row items-baseline"
                }`}
              >
                <dt className="shrink-0 text-[15px] text-muted">{d.label}</dt>
                {/* keyed by value, so a newly captured value settles in once */}
                <dd
                  key={d.value}
                  className={`m-0 flex min-w-0 items-center gap-1.5 text-right text-[15px] ${
                    provided
                      ? "ve-rise font-semibold text-foreground"
                      : "text-muted/70"
                  }`}
                >
                  {provided && <Tick />}
                  <span className="min-w-0 break-words">{d.value}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      {/* contact details, quieter */}
      <div className="border-t border-border px-6 py-4">
        <p className={sectionLabel}>Contact</p>
        <dl className="m-0 mt-2 flex flex-col gap-1.5">
          {CONTACT.map((c) => (
            <div key={c.label} className="flex items-baseline justify-between gap-4 text-sm">
              <dt className="shrink-0 text-muted">{c.label}</dt>
              <dd className="m-0 min-w-0 break-all text-right text-foreground">
                {c.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
