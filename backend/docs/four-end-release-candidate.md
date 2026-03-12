# Four-End Release Candidate

## Goal
Freeze the project into a defense-ready non-live release candidate. After this stage, the remaining work should be limited to real credentials, real upstream endpoints, and live rehearsal assets.

## Verified build matrix
- `backend`: `npm run lint`, `npm test`, `npm run smoke:fresh-install`, `npm run seed:competition:verify -- --dry-run`, `npm run migrate`
- `frontend`: `npm ci`, `npm run typecheck`, `npm run build:weapp`
- `admin`: `npm ci`, `npm run build`
- `volunteer`: `npm ci`, `npm run typecheck`, `npm run build`

## Unified default baseline
- Backend host: `http://127.0.0.1:3001`
- Frontend default API base: `http://127.0.0.1:3001/api/v1`
- Admin default API base: `http://127.0.0.1:3001`
- Volunteer default API base: `http://127.0.0.1:3001/api/v1`
- Local MySQL rehearsal port: `13307` when using host-side rehearsal
- `competition seed` is baseline demo data, not live production evidence

## Defense-ready stories
1. Event loop: `SOS / fall / GPS` anomaly -> notification -> community handling -> replay evidence.
2. Medical loop: doctor directory -> appointment creation -> evidence page shows mode, last success, and recent error.
3. Volunteer loop: task appears -> accept -> check-in -> check-out -> complete -> backend state updates.

## Release checklist
- All four ends build on a clean machine.
- No unfinished placeholder text remains in core pages.
- Volunteer side is API-driven instead of static demo data.
- Admin can consume `/admin/system/evidence` and `/admin/system/event-replay`.
- About, privacy, disclaimer, and AI usage texts are finalized.
- CI validates backend, admin, frontend, and volunteer builds.
- No competition-facing document describes Neo4j or knowledge graph as an active release capability.

## Remaining live-only work
- Fill real credentials for medical upstream, notification providers, voice providers, and OSS.
- Switch integrations from `stub-ready` to `live-ready verified` one by one.
- Capture desensitized live receipts and attach them to the real-data evidence pack.
- Rehearse the three defense stories with real providers enabled.

## Release snapshot (2026-03-12)
- Backend tests: `208` suites, `788` tests, all passing.
- Coverage: `Statements 81.93 / Branches 61.97 / Functions 82.04 / Lines 82.37`.
- Backend lint: passed.
- Backend smoke: `npm run smoke:fresh-install` => `status: ready`.
- Competition seed dry-run: `status: ready`.
- Migration status: `executed=0, skipped=29` on the current rehearsal database.
- Frontend checks: `npm run typecheck` and `npm run build:weapp` passed.
- Admin checks: `npm run build` passed.
- Volunteer checks: `npm run typecheck` and `npm run build` passed.

## Message contract freeze
- Backend business messages are standardized in English for debugging and audit consistency.
- Frontend, admin, and volunteer clients must localize by `code` and keep raw backend messages only as `debugMessage`.
- The frozen specification lives in `backend/docs/error-message-spec.md`.
