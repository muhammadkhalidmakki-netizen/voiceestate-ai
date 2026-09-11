# Demo Flow

## Purpose

This demo shows how VoiceEstate AI takes a real estate lead from CRM assignment through an AI phone conversation, qualification, property matching, CRM updates, and human handoff.

The goal is to demonstrate the complete workflow rather than only the voice conversation.

## Demo Scenario

A lead is assigned to the AI Agent in Bitrix24.

The system then:

1. Detects the AI assignment.
2. Reads the lead's CRM information.
3. Determines when the lead can be called based on their local time.
4. Triggers an outbound phone call.
5. Uses AssemblyAI for real-time speech recognition.
6. Uses GPT-4o for conversation intelligence.
7. Uses ElevenLabs for voice generation.
8. Qualifies the lead.
9. Uses available property information when appropriate.
10. Stores the conversation outcome and context in Bitrix24.
11. Hands qualified opportunities to a human sales consultant.

## Demo Sequence

### 1. Lead Assignment

Start in Bitrix24 and show a lead being assigned to the AI Agent.

The assignment triggers the automation workflow.

```text
Bitrix24
   ↓
AI Agent assigned
   ↓
n8n webhook
