# Four-End Release Candidate

## Goal
Freeze the project into a defense-ready non-live release candidate. After this stage, the remaining work should be limited to real credentials, real upstream endpoints, and live rehearsal assets.

## Verified build matrix
- `backend`: `npm run lint`, `npm test`, `npm run smoke:fresh-install`, `npm run seed:competition:verify -- --dry-run`, `npm run migrate`
- `frontend`: `npm ci`, `npm run typecheck`, `npm run build:weapp`
- `admin`: `npm ci`, `npm run build`
- `volunteer`: `npm ci`, `npm run typecheck`, `npm run build`

## Defense-ready stories
1. Event loop: `SOS / fall / GPS` anomaly -> notification -> community handling -> replay evidence.
2. Medical loop: doctor directory -> appointment creation -> evidence page shows mode, last success, and recent error.
3. Volunteer loop: task appears -> accept -> check-in -> check-out -> complete -> backend state updates.

## Environment baseline
- Backend host: `http://127.0.0.1:3001`
- Volunteer default API base: `http://localhost:3000/api/v1` and should be aligned with the actual gateway during rehearsal.
- Local MySQL rehearsal port: `13307` when using host-side rehearsal.
- `competition seed` is baseline demo data, not live production evidence.

## Release checklist
- All four ends build on a clean machine.
- No unfinished placeholder text remains in core pages.
- Volunteer side is API-driven instead of static demo data.
- Admin can consume `/admin/system/evidence` and `/admin/system/event-replay`.
- About, privacy, disclaimer, and AI usage texts are finalized.
- CI validates backend, admin, frontend, and volunteer builds.

## Remaining live-only work
- Fill real credentials for medical upstream, notification providers, voice providers, and OSS.
- Switch integrations from `stub-ready` to `live` one by one.
- Capture desensitized live receipts and attach them to the real-data evidence pack.
- Rehearse the three defense stories with real providers enabled.
