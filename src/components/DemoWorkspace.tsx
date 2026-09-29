"use client";

import { useCallback, useRef, useState } from "react";
import {
  applyUserMessage,
  INITIAL_LIVE_LEAD,
  rememberAssistant,
  type LiveLead,
} from "../lib/qualification";
import LeadCard from "./LeadCard";
import VoiceControls from "./VoiceControls";

// Owns the live qualification + stage state shared by the lead card and the
// call panel. Purely browser-side: it decides from finished USER utterances
// (the assistant's last sentence is only context for reading a reply) and never
// talks to Vapi, the assistant or any backend.
export default function DemoWorkspace() {
  const [lead, setLead] = useState<LiveLead>(INITIAL_LIVE_LEAD);

  // The assistant's last two finished sentences. They are only used to read the
  // lead's NEXT reply (a bare "yes" to what?), never to decide a stage itself.
  const lastAssistantText = useRef("");

  const handleAssistantFinal = useCallback((text: string) => {
    lastAssistantText.current = rememberAssistant(lastAssistantText.current, text);
  }, []);

  const handleUserFinal = useCallback((text: string) => {
    const assistantText = lastAssistantText.current;
    setLead((prev) => applyUserMessage(prev, text, { assistantText }));
  }, []);

  const handleCallStart = useCallback(() => {
    lastAssistantText.current = "";
    setLead(INITIAL_LIVE_LEAD);
  }, []);

  return (
    <>
      <LeadCard qualification={lead.qualification} stage={lead.stage} />
      <section
        aria-label="Voice assistant"
        className="flex h-[42rem] min-h-0 overflow-hidden rounded-2xl border border-border bg-background shadow-[0_12px_40px_-18px_rgba(11,18,32,0.16)] lg:h-[calc(100vh-10rem)] lg:max-h-[54rem] lg:min-h-[38rem]"
      >
        <VoiceControls
          onUserFinal={handleUserFinal}
          onAssistantFinal={handleAssistantFinal}
          onCallStart={handleCallStart}
          lead={lead}
        />
      </section>
    </>
  );
}
