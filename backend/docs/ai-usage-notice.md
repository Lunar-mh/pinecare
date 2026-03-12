# AI Usage Notice

## Version
- Version: 2026.03-live-defense
- Effective date: 2026-03-12

## Covered services
- AI health consultation
- AI companion conversation
- Voice ASR and TTS support in care workflows

## Usage boundaries
- AI consultation provides supportive interpretation and triage guidance, not definitive diagnosis
- AI companion focuses on interaction, not medical instruction
- Voice and AI tasks may operate in live or fallback mode depending on runtime configuration

## Operational requirements
- All provider results must expose requested mode, effective mode, live configuration state, and recent error context when available
- Unsafe, ambiguous, or unavailable responses must degrade to guarded wording or fallback behavior
- Defense materials must include human-oversight language and real/stub separation
