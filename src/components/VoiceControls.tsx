"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_LEAD_VARIABLES } from "../lib/demoLead";
import { buildCallSummary } from "../lib/callSummary";
import type { LiveLead } from "../lib/qualification";
import {
  checkCallAllowed,
  discardLastStart,
  DURATION_LIMIT_MESSAGE,
  formatClock,
  getBrowserStorage,
  loadHistory,
  MAX_CALL_SECONDS,
  recordCallEnd,
  recordCallStart,
  saveHistory,
} from "../lib/demoLimits";
import { classifyVapiError } from "../lib/vapiErrors";
import CallSummary from "./CallSummary";
import VoiceOrb from "./VoiceOrb";
import {
  getVapiAssistantId,
  getVapiClient,
  isVapiConfigured,
} from "../lib/vapi";

type CallStatus = "ready" | "connecting" | "active" | "ended";

type TranscriptEntry = {
  id: number;
  role: "user" | "assistant";
  text: string;
  final: boolean;
};

type VapiMessage = {
  type?: string;
  role?: string;
  transcriptType?: string;
  transcript?: string;
};

const START_LABEL: Record<CallStatus, string> = {
  ready: "Call now",
  connecting: "Calling…",
  active: "Calling…",
  ended: "Call again",
};

const STATUS_LABEL: Record<CallStatus, string> = {
  ready: "Ready",
  connecting: "Connecting",
  active: "Active",
  ended: "Ended",
};

type VoiceControlsProps = {
  /** Called with the text of each finished user utterance. */
  onUserFinal?: (text: string) => void;
  /** Called when a new call is started, before connecting. */
  onCallStart?: () => void;
  /** Live qualification + stage, used only to build the post-call summary. */
  lead?: LiveLead;
};

export default function VoiceControls({
  onUserFinal,
  onCallStart,
  lead,
}: VoiceControlsProps) {
  const [status, setStatus] = useState<CallStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const configured = isVapiConfigured();

  // Keep the latest callbacks reachable from the long-lived Vapi listener.
  const onUserFinalRef = useRef(onUserFinal);
  useEffect(() => {
    onUserFinalRef.current = onUserFinal;
  });

  useEffect(() => {
    if (!configured) return;
    const vapi = getVapiClient();

    const onStart = () => setStatus("active");
    const onEnd = () => setStatus("ended");
    const onError = (e: unknown) => {
      const kind = classifyVapiError(e);
      if (kind === "call-ended") {
        // Vapi closing the room at the end of a call: a normal termination.
        console.info("Vapi call ended", e);
        setStatus("ended");
        return;
      }
      if (kind === "non-critical") {
        // The SDK says the call continues: log only, leave call state alone.
        console.warn("Vapi non-critical error", e);
        return;
      }
      console.error("Vapi error", e);
      setError("Something went wrong with the call.");
      setStatus("ended");
    };

    // Partial transcripts update the in-progress bubble for that speaker;
    // a final transcript closes it, and the next utterance starts a new one.
    const onMessage = (m: VapiMessage) => {
      if (m.type !== "transcript" || !m.transcript) return;
      if (m.role !== "user" && m.role !== "assistant") return;
      const role = m.role;
      const text = m.transcript;
      const final = m.transcriptType === "final";
      if (final && role === "user") onUserFinalRef.current?.(text);
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.final) {
          return [...prev.slice(0, -1), { ...last, text, final }];
        }
        return [...prev, { id: nextId.current++, role, text, final }];
      });
    };

    vapi.on("call-start", onStart);
    vapi.on("call-end", onEnd);
    vapi.on("error", onError);
    vapi.on("message", onMessage);
    return () => {
      vapi.removeListener("call-start", onStart);
      vapi.removeListener("call-end", onEnd);
      vapi.removeListener("error", onError);
      vapi.removeListener("message", onMessage);
    };
  }, [configured]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript]);

  // Post-call summary: built from the existing transcript + live lead state,
  // and only once the call has ended.
  const summary =
    status === "ended" && lead
      ? buildCallSummary(
          transcript.map((m) => ({ role: m.role, text: m.text })),
          { qualification: lead.qualification, stage: lead.stage },
        )
      : null;
  const hasSummary = summary !== null;
  useEffect(() => {
    if (hasSummary) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [hasSummary]);

  // Demo limits, part 1: when a call ends (for any reason), record its end time
  // so the cooldown counts from then.
  useEffect(() => {
    if (status !== "ended") return;
    const storage = getBrowserStorage();
    saveHistory(recordCallEnd(loadHistory(storage), Date.now()), storage);
  }, [status]);

  // Demo limits, part 2: a visible countdown that hangs up at the maximum
  // duration. (Vapi is also told the same cap via maxDurationSeconds.)
  const stopRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => {
    if (status !== "active") return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = MAX_CALL_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        setLimitMessage(DURATION_LIMIT_MESSAGE);
        void stopRef.current();
      } else {
        setSecondsLeft(left);
      }
    }, 500);
    return () => {
      clearInterval(timer);
      setSecondsLeft(null);
    };
  }, [status]);

  async function start() {
    // Demo limits, part 3: check BEFORE touching anything, so a blocked click
    // leaves the previous transcript and summary intact.
    const storage = getBrowserStorage();
    const decision = checkCallAllowed(loadHistory(storage), Date.now());
    if (!decision.allowed) {
      setLimitMessage(decision.message);
      return;
    }
    saveHistory(recordCallStart(loadHistory(storage), Date.now()), storage);

    setLimitMessage(null);
    setError(null);
    setTranscript([]);
    onCallStart?.();
    setStatus("connecting");
    try {
      await getVapiClient().start(getVapiAssistantId(), {
        variableValues: DEMO_LEAD_VARIABLES,
        maxDurationSeconds: MAX_CALL_SECONDS,
      });
    } catch (e) {
      console.error("Vapi start failed", e);
      setError("Could not start the conversation.");
      // a call that never connected shouldn't use up the lead's quota
      saveHistory(discardLastStart(loadHistory(storage)), storage);
      setStatus("ended");
    }
  }

  async function stop() {
    try {
      await getVapiClient().stop();
    } catch (e) {
      console.error("Vapi stop failed", e);
    }
    setStatus("ended");
  }

  const idle = status === "ready" || status === "ended";
  const canCall = configured && idle;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 rounded-full border border-border px-4 py-2 text-[15px]">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                status === "active"
                  ? "bg-accent"
                  : status === "connecting"
                    ? "animate-pulse bg-accent/60"
                    : "bg-border"
              }`}
            />
            <span className="text-muted">Call status</span>
            <span aria-live="polite" className="font-medium">
              {STATUS_LABEL[status]}
            </span>
            {status === "active" && (
              <span className="tabular-nums text-muted">
                · {formatClock(secondsLeft ?? MAX_CALL_SECONDS)} left
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stop}
              disabled={idle}
              className="cursor-pointer rounded-full border border-border bg-background px-5 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted/60"
            >
              Stop Conversation
            </button>
            <span className="relative inline-flex">
              {canCall && (
                <span
                  aria-hidden="true"
                  className="ve-cta-ring pointer-events-none absolute inset-0 rounded-full border-2 border-brand-blue"
                />
              )}
              <button
                type="button"
                onClick={start}
                disabled={!canCall}
                className="relative inline-flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-[#1f7ae0] to-[#0a9d7c] px-6 py-2.5 text-[15px] font-medium text-white transition-[filter] hover:brightness-95 disabled:cursor-default"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={`h-[18px] w-[18px] ${canCall ? "ve-phone-ring" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
                </svg>
                {START_LABEL[status]}
              </button>
            </span>
          </div>
        </div>

        {!configured && (
          <p className="mt-2 text-xs text-muted">
            Add your Vapi public key and assistant ID to .env.local, then
            restart the server.
          </p>
        )}
        {limitMessage && (
          <p role="status" className="mt-2 text-sm text-amber-800">
            {limitMessage}
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <VoiceOrb status={status} />

      <div
        role="log"
        aria-label="Conversation transcript"
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-6"
      >
        {transcript.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-8 w-8 text-border"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
            </svg>
            <p className="text-[15px] text-muted">
              The conversation will appear here.
            </p>
          </div>
        ) : (
          transcript.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col gap-1 ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <span className="px-1 text-xs text-muted">
                {m.role === "user" ? "You" : "Agent"}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-foreground text-white"
                    : "border border-border bg-surface"
                } ${m.final ? "" : "opacity-70"}`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
        {summary && lead && <CallSummary data={summary} stage={lead.stage} />}
        <div ref={endRef} />
      </div>
    </div>
  );
}
