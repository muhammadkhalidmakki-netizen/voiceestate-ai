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
 ┌─────┴────────────┐
 ▼        ▼         ▼
Lead Context  Property Data  Follow-up
 │        │         │
 └────────┼─────────┘
          │
          ▼
 ┌───────────┐
 │   Vapi    │
 │Voice Layer│
 └─────┬─────┘
       │
 ┌─────┼─────────┐
 ▼     ▼         ▼
AssemblyAI  GPT-4o  ElevenLabs
   STT        AI        TTS
 └─────┼─────────┘
       │
       ▼
 Twilio Phone
       │
       ▼
     LEAD
```

## Component Responsibilities

### Bitrix24 — CRM

Bitrix24 acts as the CRM layer and operational source of lead information.

It provides the lead context required by the voice workflow and receives the resulting qualification and call information.

### n8n — Orchestration

n8n acts as the workflow orchestrator.

It coordinates the automation between the CRM, lead context, property data, follow-up logic, and voice layer.

### Vapi — Voice Layer

Vapi manages the real-time voice interaction and connects the speech recognition, conversation AI, and text-to-speech components into the live call.

### AssemblyAI — Speech-to-Text

AssemblyAI provides real-time speech recognition.

It converts the lead's spoken input into text that can be processed by the conversation intelligence layer.

### GPT-4o — AI

GPT-4o provides conversation intelligence.

It processes the available context and generates the conversational response for the voice agent.

### ElevenLabs — Text-to-Speech

ElevenLabs converts the AI-generated response into natural-sounding speech for the caller.

### Twilio — Phone

Twilio provides the phone connectivity used for the real phone conversation.

### Property Data

Structured property data provides project information that can be used when the lead discusses property requirements or project interests.

### Follow-Up

The follow-up layer manages subsequent contact attempts and related lead-engagement workflow.

## Data Flow

The primary flow is:

```text
Lead Source
    ↓
Bitrix24
    ↓
n8n
    ↓
Lead Context + Property Data + Follow-Up Logic
    ↓
Vapi
    ↓
AssemblyAI / GPT-4o / ElevenLabs
    ↓
Twilio Phone
    ↓
Lead
```

This separation keeps CRM data, workflow automation, voice orchestration, speech recognition, conversation intelligence, voice generation, telephony, and property information as distinct responsibilities.
