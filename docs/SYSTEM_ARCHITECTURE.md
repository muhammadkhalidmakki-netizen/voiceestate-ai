# System Architecture

## Overview

VoiceEstate AI is a production-oriented AI voice agent architecture designed for real estate lead qualification, follow-up, property discovery, CRM intelligence, and human handoff.

The architecture separates responsibilities across CRM, automation, voice orchestration, AI conversation, speech recognition, voice generation, and property intelligence.

## Core Architecture

```text
                    LEAD SOURCES
              Meta Ads / Google Ads
                       │
                       ▼
                 ┌───────────┐
                 │ Bitrix24  │
                 │    CRM    │
                 └─────┬─────┘
                       │
                       ▼
                 ┌───────────┐
                 │    n8n    │
                 │Orchestrator│
                 └─────┬─────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   Lead Context   Property Data   Follow-up
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                 ┌───────────┐
                 │   Vapi    │
                 │Voice Layer│
                 └─────┬─────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
        AssemblyAI   GPT-4o   ElevenLabs
          STT          AI          TTS
             └─────────┼─────────┘
                       │
                       ▼
                  Twilio Phone
                       │
                       ▼
                     LEAD
