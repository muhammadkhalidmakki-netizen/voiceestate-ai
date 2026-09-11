# AssemblyAI Integration

## Overview

VoiceEstate AI uses AssemblyAI as the real-time speech-to-text (STT) layer for its voice agent.

AssemblyAI is integrated directly through Vapi's transcriber configuration, allowing spoken input from real phone calls to be converted into text before being processed by the conversation model.

## Integration

The current voice pipeline is:

```text
Lead speaks
    ↓
Twilio
    ↓
Vapi
    ↓
AssemblyAI — Universal 3.5 Pro
    ↓
GPT-4o
    ↓
ElevenLabs
    ↓
Vapi / Twilio
    ↓
Lead hears response
