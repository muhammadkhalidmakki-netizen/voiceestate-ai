# VoiceEstate AI

### AI Voice Agent for Real Estate Lead Qualification & Follow-Up

VoiceEstate AI is an AI-powered voice agent built for Dubai real estate lead engagement.

It connects real-time voice conversations with CRM intelligence, automated follow-ups, and live property data to help real estate teams qualify leads faster and hand genuinely interested prospects to human sales consultants with the right context already prepared.

The system is designed to **qualify and nurture leads — not replace the human closer.**

---

## 🎯 The Problem

Real estate leads often arrive from advertising campaigns, landing pages, property portals, and other marketing channels.

The challenge is what happens after the lead arrives:

- Leads need to be contacted quickly.
- Many leads do not answer the first call.
- Requirements such as budget, purpose, location, and property preferences need to be understood.
- Follow-ups need to happen at appropriate times.
- Sales teams need the conversation history before taking over.
- Property recommendations must be based on real project data rather than AI-generated guesses.

VoiceEstate AI automates this process while keeping the CRM as the operational source of truth.

---

## 🤖 What VoiceEstate AI Does

The system can:

- Engage new real estate leads through AI voice calls
- Understand the lead's property requirements
- Qualify investment vs. end-user intent
- Capture and confirm budget information
- Understand location and lifestyle preferences
- Search available Dubai property projects
- Recommend relevant projects using structured project data
- Maintain AI conversation memory between calls
- Schedule follow-up attempts
- Handle no-answer, busy, callback, and other call outcomes
- Update the CRM automatically
- Identify job/employment enquiries separately from property leads
- Escalate qualified leads to a human sales consultant

---

## 🧠 Why This Is More Than a Voice Bot

VoiceEstate AI is not just a voice interface.

It is an orchestration system connecting:

**Lead → CRM → Automation → AI Voice → Property Intelligence → CRM Memory → Follow-Up → Human Handoff**

The voice conversation is only one part of the system.

The surrounding automation allows the AI to operate as part of an actual sales workflow rather than as an isolated conversational demo.

---

## 🏗️ Architecture

```text
                    LEAD SOURCES
        ┌───────────────────────────────────┐
        │ Meta Ads │ Google Ads │ Portals   │
        │ Landing Pages │ WhatsApp Campaigns│
        └─────────────────┬─────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    BITRIX24      │
                 │  CRM + MEMORY    │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │       n8n       │
                 │  ORCHESTRATION  │
                 └───────┬─────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
      ┌───────────────┐     ┌─────────────────┐
      │ Property Data │     │ Follow-Up Engine│
      │ / Project     │     │ Calls / Tasks   │
      │ Cache         │     │ / Messaging     │
      └───────┬───────┘     └─────────────────┘
              │
              ▼
       ┌───────────────┐
       │ Context Engine│
       │ Pre-call AI   │
       │ Context       │
       └───────┬───────┘
               │
               ▼
       ┌─────────────────────┐
       │        VAPI         │
       │   Voice Orchestration│
       └─────────┬───────────┘
                 │
          ┌──────┴─────────┐
          │                │
          ▼                ▼
   ┌─────────────┐  ┌──────────────┐
   │ AssemblyAI  │  │    GPT-4o    │
   │     STT     │  │ Conversation │
   │             │  │ Intelligence │
   └─────────────┘  └──────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ ElevenLabs  │
                   │ AI Voice    │
                   └──────┬──────┘
                          │
                          ▼
                    REAL PHONE CALL
                          │
                          ▼
                   CALL RESULT ENGINE
                          │
                          ▼
                      BITRIX24
                          │
                          ▼
                  HUMAN SALES HANDOFF
