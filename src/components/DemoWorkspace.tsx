"use client";

import { useCallback, useState } from "react";
import {
  applyUserMessage,
  INITIAL_LIVE_LEAD,
  type LiveLead,
} from "../lib/qualification";
import LeadCard from "./LeadCard";
import VoiceControls from "./VoiceControls";

// Owns the live qualification + stage state shared by the lead card and the
// call panel. Purely browser-side: it reads finished USER utterances only and
// never talks to Vapi, the assistant or any backend.
export default function DemoWorkspace() {
  const [lead, setLead] = useState<LiveLead>(INITIAL_LIVE_LEAD);

  const handleUserFinal = useCallback((text: string) => {
    setLead((prev) => applyUserMessage(prev, text));
  }, []);

  const handleCallStart = useCallback(() => {
    setLead(INITIAL_LIVE_LEAD);
  }, []);

  return (
    <>
      <LeadCard qualification={lead.qualification} stage={lead.stage} />
      <section
        aria-label="Voice assistant"
        className="flex h-[36rem] overflow-hidden rounded-2xl border border-border lg:h-[40rem]"
      >
        <VoiceControls
          onUserFinal={handleUserFinal}
          onCallStart={handleCallStart}
          lead={lead}
        />
      </section>
    </>
  );
}
