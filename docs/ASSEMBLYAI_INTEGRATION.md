# AssemblyAI Integration

## Overview

VoiceEstate AI uses **AssemblyAI** as the speech-to-text (STT) layer inside the Vapi voice pipeline.

The integration allows the AI voice agent to receive spoken input from an actual phone conversation, transcribe it in real time, and pass the resulting text into the conversation intelligence layer.

AssemblyAI handles speech recognition while Vapi remains responsible for the live voice orchestration.

---

## Integration Architecture

```text
Lead speaks
    ↓
Twilio
    ↓
Vapi
    ↓
AssemblyAI
    ↓
GPT-4o
    ↓
ElevenLabs
    ↓
Vapi
    ↓
Twilio
    ↓
Lead
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| Twilio | Phone connectivity / telephony |
| Vapi | Real-time voice orchestration |
| AssemblyAI | Speech-to-text transcription |
| GPT-4o | Conversation intelligence |
| ElevenLabs | Text-to-speech / AI voice |
| Bitrix24 | CRM context and operational memory |
| n8n | Workflow orchestration and automation |

---

## AssemblyAI Configuration

The active Vapi assistant uses:

- **Transcriber:** AssemblyAI
- **Model:** Universal 3.5 Pro
- **Automatic language detection:** Enabled
- **Intelligent turn-taking:** Enabled

The configuration was applied directly to the Vapi assistant's transcriber settings.

---

## Why AssemblyAI Is Used

VoiceEstate AI requires reliable real-time speech recognition because the agent is designed for natural phone conversations rather than a text-only chatbot.

The STT layer needs to:

1. Receive the lead's spoken audio.
2. Convert speech into text in real time.
3. Provide the transcript to the conversational AI.
4. Allow GPT-4o to generate the appropriate response.
5. Continue the live conversation through Vapi.

AssemblyAI therefore sits between the caller's speech and the conversation intelligence layer.

---

## Vapi Integration

AssemblyAI is configured directly as the Vapi assistant's transcriber.

The integration does **not** require a separate custom speech-processing service for the current implementation.

```text
Vapi Assistant
      │
      └── Transcriber
              │
              └── AssemblyAI Universal 3.5 Pro
```

Vapi continues to manage the real-time call lifecycle, while AssemblyAI provides the transcription capability.

---

## Real Phone Call Validation

The integration was validated using an **actual phone call**, not only Vapi's browser-based testing environment.

This distinction is important because browser testing and real telephony can use different audio pipelines.

The successful phone test confirmed that:

- The Vapi assistant could receive the caller's speech.
- AssemblyAI could transcribe the live call input.
- The conversation could continue through the configured voice pipeline.
- The complete voice interaction worked over the real phone connection.

---

## Automatic Language Detection

Automatic language detection is enabled in the AssemblyAI transcriber configuration.

The broader system is designed primarily around:

- English
- Urdu
- Hindi

However, real-time multilingual and code-switched speech recognition is treated as a separate engineering concern from simply enabling automatic language detection.

The project has tested multiple transcriber configurations for English/Urdu behavior, and reliable mid-call English↔Urdu switching remains an open investigation item.

Therefore, the public project does **not** claim that automatic detection guarantees perfect code-switching accuracy.

---

## Current Voice Pipeline

The current production-style pipeline is:

```text
                    ┌───────────────┐
                    │   Lead/User   │
                    └───────┬───────┘
                            │
                         Speech
                            │
                            ▼
                    ┌───────────────┐
                    │    Twilio     │
                    │   Telephony   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │     Vapi      │
                    │ Voice Runtime │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  AssemblyAI   │
                    │     STT       │
                    └───────┬───────┘
                            │
                        Transcript
                            │
                            ▼
                    ┌───────────────┐
                    │    GPT-4o     │
                    │ Conversation  │
                    │ Intelligence  │
                    └───────┬───────┘
                            │
                       Response Text
                            │
                            ▼
                    ┌───────────────┐
                    │  ElevenLabs   │
                    │      TTS      │
                    └───────┬───────┘
                            │
                         AI Voice
                            │
                            ▼
                    ┌───────────────┐
                    │     Vapi      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Twilio     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │     Lead      │
                    └───────────────┘
```

---

## Relationship With the Rest of the System

AssemblyAI is intentionally kept as a specialized component rather than becoming the workflow brain.

The responsibilities remain separated:

### Bitrix24
CRM source of truth and operational memory.

### n8n
Workflow orchestration, scheduling, follow-up logic, and CRM automation.

### Vapi
Real-time voice session and call orchestration.

### AssemblyAI
Speech recognition.

### GPT-4o
Conversation reasoning and response generation.

### ElevenLabs
Voice generation.

### Twilio
Telephony.

This separation allows the speech-recognition layer to be changed or tested without redesigning the complete sales automation architecture.

---

## Security

The public repository does not contain:

- AssemblyAI API keys
- Vapi API keys
- Twilio credentials
- ElevenLabs credentials
- OpenAI credentials
- Private webhook URLs
- Production phone numbers
- Customer or lead data

The repository documents the integration architecture and implementation approach without exposing production credentials or private customer information.

---

## Current Status

**AssemblyAI integration: COMPLETE**

The AssemblyAI transcriber is configured in Vapi using Universal 3.5 Pro, with automatic language detection and intelligent turn-taking enabled.

The integration has been validated through an actual phone call.

Further work around multilingual/code-switched language detection is tracked separately and is not considered part of the basic AssemblyAI integration.

---

## Hackathon Relevance

For the AssemblyAI Voice Agent Hackathon, AssemblyAI is a core part of the live voice pipeline.

Rather than using AssemblyAI as an isolated transcription demo, VoiceEstate AI integrates speech recognition into a complete real-world workflow:

```text
Real Estate Lead
      ↓
CRM Context
      ↓
Automated Call
      ↓
AssemblyAI Speech Recognition
      ↓
AI Conversation
      ↓
Lead Qualification
      ↓
CRM Update
      ↓
Follow-Up
      ↓
Human Sales Handoff
```

The key idea is to demonstrate how real-time speech recognition can become part of a useful production-oriented voice agent system.
