# API Acceptance Checklist (Competition Baseline)

## Common Checks

- [ ] Response shape is `{ code, message, data }`
- [ ] Success uses `code: 0`
- [ ] Errors use business/http code mapping (400/401/403/404/409/422/429/503/504)
- [ ] Both route prefixes work: `/api/v1/*` and `/*`

## Module Routing Coverage

- [ ] 001 User/Auth: `/auth`, `/user`
- [ ] 002 Health Archive: `/health-archive`
- [ ] 003 Medication: `/medication`
- [ ] 004 SOS: `/sos`
- [ ] 005 Family: `/family`
- [ ] 006 Voice: `/voice`
- [ ] 007 Fall Detection: `/fall-detection`
- [ ] 008 AI Consult: `/ai-consult`
- [ ] 009 Drug Interaction: `/drug-interaction`
- [ ] 010 Time Bank: `/time-bank`
- [ ] 011 AI Companion: `/ai-companion`
- [ ] 012 Family Space: `/family-space`
- [ ] 013 Community Admin: `/community`
- [ ] 014 GPS: `/gps`
- [ ] 015 Medical: `/medical`

## Legacy Compatibility (temporary)

- [ ] `/timebank/*` alias enabled
- [ ] `/location/*` alias enabled
- [ ] `/companion/*` alias enabled

## Priority Regression Paths

- [ ] Auth login + refresh + protected access
- [ ] Health archive write + trend query
- [ ] Medication plan CRUD + confirm flow + reminder job
- [ ] SOS trigger/cancel/history + notification queue
- [ ] GPS upload/current/trail + fence alerts
- [ ] Medical doctors/appointment/reports end-to-end
