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

function Rows({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl>
      {items.map((d) => (
        <div
          key={d.label}
          className={`flex justify-between gap-x-4 gap-y-0.5 border-b border-border py-3 last:border-b-0 ${
            d.value.length > 22
              ? "flex-col items-start"
              : "flex-row items-baseline"
          }`}
        >
          <dt className="shrink-0 text-[15px] text-muted">{d.label}</dt>
          <dd
            className={`min-w-0 break-words text-right text-[15px] ${
              d.value === NOT_PROVIDED
                ? "text-muted/70"
                : "font-medium text-foreground"
            }`}
          >
            {d.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="pt-4 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </p>
  );
}

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
};

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
  const initials = DEMO_LEAD.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <aside
      aria-label="Lead profile"
      className="self-start rounded-2xl border border-border bg-background"
    >
      <div className="border-b border-border px-6 py-6">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-foreground text-lg font-medium text-white"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-medium leading-tight tracking-tight">
              {DEMO_LEAD.name}
            </h1>
            <p className="mt-0.5 text-[15px] text-muted">{DEMO_LEAD.title}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[15px] font-medium ${stageStyle.pill}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${stageStyle.dot}`}
            />
            {stage}
          </span>
          <span className="inline-flex items-center rounded-full border border-border px-3.5 py-1.5 text-sm text-muted">
            Source · {DEMO_LEAD.source}
          </span>
        </div>
      </div>

      <div className="px-6 pb-3">
        <SectionLabel>Contact</SectionLabel>
        <Rows items={CONTACT} />
        <div className="border-t border-border" />
        <SectionLabel>Qualification</SectionLabel>
        <Rows items={details} />
      </div>
    </aside>
  );
}
