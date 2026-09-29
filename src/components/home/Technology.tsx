import InView from "./InView";

// Same scroll-reveal as the other homepage sections (driven by InView).
const reveal =
  "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none group-data-[state=armed]:translate-y-3 group-data-[state=armed]:opacity-0";

const svgProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "h-4 w-4",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// one small glyph per layer
const ICONS = {
  speech: (
    <svg {...svgProps}>
      <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
    </svg>
  ),
  conversation: (
    <svg {...svgProps}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  ),
  property: (
    <svg {...svgProps}>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2" />
    </svg>
  ),
  automation: (
    <svg {...svgProps}>
      <path d="M4 7h6M14 7h6M4 17h6M14 17h6M10 7a2 2 0 1 0 0 .01M14 17a2 2 0 1 0 0 .01M12 9v6" />
    </svg>
  ),
  human: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
};

type Tech = { name: string; role: string };

const LAYERS: {
  title: string;
  text: string;
  icon: keyof typeof ICONS;
  tech?: Tech[];
}[] = [
  {
    title: "AssemblyAI",
    text: "Listens to the call in real time and turns the lead’s speech into text the agent can act on.",
    icon: "speech",
  },
  {
    title: "VoiceEstate AI",
    text: "Runs the conversation: asks about purpose, budget and area, answers naturally and speaks back in a human voice.",
    icon: "conversation",
    tech: [
      { name: "Vapi", role: "live calls" },
      { name: "GPT-4o", role: "reasoning" },
      { name: "ElevenLabs", role: "voice" },
      { name: "Twilio", role: "calls & WhatsApp" },
    ],
  },
  {
    title: "Property Intelligence",
    text: "Checks what the lead wants against your own Dubai project database, so every suggestion is a real listing.",
    icon: "property",
  },
  {
    title: "CRM & Automation",
    text: "Updates the lead record, schedules the next call and sends the WhatsApp follow-up.",
    icon: "automation",
    tech: [
      { name: "n8n", role: "automation" },
      { name: "Bitrix24", role: "CRM" },
    ],
  },
  {
    title: "Human Sales Closer",
    text: "Picks up a qualified buyer with the summary, budget and matched projects already in hand.",
    icon: "human",
  },
];

const WAVE = [40, 70, 100, 62, 84, 48];

export default function Technology() {
  const last = LAYERS.length - 1;

  return (
    <section id="technology" className="scroll-mt-32 md:scroll-mt-20">
      <InView className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* heading */}
          <div className={`lg:sticky lg:top-28 lg:self-start ${reveal}`}>
            <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-xs sm:tracking-[0.14em]">
              <span aria-hidden="true" className="hidden h-px w-8 bg-[#0a9d7c] sm:block" />
              Voice intelligence
            </p>
            <h2 className="m-0 max-w-[15ch] text-[2.1rem] font-[650] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.7rem] lg:text-[2.75rem]">
              Built for real conversations. Connected to real property data.
            </h2>
            <p className="m-0 mt-6 max-w-[27rem] text-pretty text-lg leading-relaxed text-foreground">
              AssemblyAI handles the live speech layer while the rest of the
              system connects conversation, property intelligence, automation,
              and human sales <span className="whitespace-nowrap">follow-up</span>.
            </p>
          </div>

          {/* the architecture, top to bottom */}
          <ol className="relative m-0 list-none p-0">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-[11px] top-4 w-[7px] transition-opacity duration-700 ease-out motion-reduce:transition-none group-data-[state=armed]:opacity-0"
              style={{ transitionDelay: "150ms" }}
            >
              <span className="absolute left-[3px] top-0 h-full w-px bg-border" />
              <span className="ve-descend absolute left-0 top-0 h-[7px] w-[7px] rounded-full bg-[#09c19a]" />
            </span>

            {LAYERS.map((l, i) => {
              const isFirst = i === 0;
              return (
                <li
                  key={l.title}
                  className={`group/node relative pl-14 ${i < last ? "pb-12" : ""} ${reveal}`}
                  style={{ transitionDelay: `${150 + i * 130}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className="ve-node absolute left-0 top-0 flex h-[30px] w-[30px] items-center justify-center rounded-full border border-border bg-background text-muted"
                    style={{ animationDelay: `${i * 2}s` }}
                  >
                    {ICONS[l.icon]}
                  </span>

                  {i < last && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-[7px] flex h-4 w-4 items-center justify-center bg-background text-[#0a9d7c]"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  )}

                  {isFirst ? (
                    <div className="rounded-2xl border border-[#09c19a]/50 bg-background px-5 py-4 shadow-[0_10px_30px_-18px_rgba(11,18,32,0.2)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#067a63]">
                            Live speech layer
                          </p>
                          <h3 className="m-0 mt-1 text-2xl font-[650] leading-tight tracking-tight text-foreground">
                            {l.title}
                          </h3>
                          <p className="m-0 mt-0.5 text-sm font-semibold text-[#067a63]">
                            Universal 3.5 Pro
                          </p>
                        </div>
                        <div className="flex h-9 shrink-0 items-center gap-[3px]" aria-hidden="true">
                          {WAVE.map((h, k) => (
                            <span
                              key={k}
                              className="ve-bar block w-[3px] rounded-full bg-[#09c19a]"
                              style={{ height: `${h}%`, animationDelay: `${k * 0.13}s` }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="m-0 mt-3 text-[15px] leading-relaxed text-foreground">
                        {l.text}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-0.5">
                      <h3 className="m-0 text-[17px] font-semibold leading-snug text-foreground transition-colors duration-300 group-hover/node:text-[#067a63]">
                        {l.title}
                      </h3>
                      <p className="m-0 mt-1 text-[14.5px] leading-relaxed text-muted">
                        {l.text}
                      </p>
                      {l.tech && (
                        <p className="m-0 mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
                          {l.tech.map((t) => (
                            <span key={t.name}>
                              <b className="font-semibold text-foreground">{t.name}</b>{" "}
                              {t.role}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </InView>
    </section>
  );
}
