# Data Desensitization Note

## Version
- Version: 2026.03-live-defense
- Effective date: 2026-03-12

## Masking rules
- Phone numbers: retain limited prefix and suffix only
- ID cards: retain limited prefix and suffix only
- Access tokens, raw provider URLs, session links, and medical report URLs: never expose to defense materials
- Medical reports and GPS traces: use screenshots or summaries with identifiers removed

## Evidence export rules
- Prefer request ID, task ID, message ID, biz ID, and object key over raw response payloads
- Separate competition seed data from live data evidence
- Preserve audit event IDs, replay user IDs, and operation names so evidence remains traceable without leaking sensitive content
