import InView from "./InView";
import StepsExplorer from "./StepsExplorer";

const STEPS = [
  {
    title: "Lead comes in",
    text: "A new property enquiry enters the sales workflow.",
  },
  {
    title: "AI calls",
    text: "VoiceEstate AI starts the conversation and understands why the lead is looking.",
  },
  {
    title: "Qualification",
    text: "The agent learns the buyer’s purpose, budget, preferred area and property requirements.",
  },
  {
    title: "Property match",
    text: "The system searches the Dubai property data and returns relevant projects instead of inventing recommendations.",
  },
  {
    title: "Follow-up",
    text: "Interested leads continue through the follow-up workflow.",
  },
  {
    title: "Human handoff",
    text: "When the lead is ready, the qualified opportunity goes to the human sales closer.",
  },
];

const reveal =
  "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none group-data-[state=armed]:translate-y-3 group-data-[state=armed]:opacity-0";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-32 md:scroll-mt-20">
      <InView className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:pb-22 sm:pt-28">
        {/* heading */}
        <div
          className={`grid items-end gap-6 lg:grid-cols-[1fr_27rem] lg:gap-16 ${reveal}`}
        >
          <div>
            <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-xs sm:tracking-[0.14em]">
              <span aria-hidden="true" className="hidden h-px w-8 bg-[#0a9d7c] sm:block" />
              How it works
            </p>
            <h2 className="m-0 max-w-[16ch] text-[2.1rem] font-[650] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.7rem] lg:text-[3rem]">
              From first enquiry to qualified opportunity.
            </h2>
          </div>
          <p className="m-0 text-lg leading-relaxed text-foreground">
            One workflow turns a fresh property enquiry into a sales-ready
            conversation &mdash; without asking your team to chase every lead.
          </p>
        </div>

        {/* the progression: interactive, see StepsExplorer */}
        <StepsExplorer steps={STEPS} />
      </InView>
    </section>
  );
}
