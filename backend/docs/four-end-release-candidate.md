# Four-End Release Candidate

## Goal
Freeze the project into a defense-ready non-live release candidate. After this stage, the remaining work should be limited to real credentials, real upstream endpoints, live-provider rehearsal, and evidence capture.

## Verified build matrix
- `backend`: `npm run lint`, `npm test -- --silent`, `npm run test:security`, `npm run test:performance`, `npm run audit:performance`, `npm run smoke:fresh-install`, `npm run seed:competition:verify -- --dry-run`, `npm run migrate`
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
- Signing and receipt generation fail closed when `HASH_SECRET` or `PLATFORM_PRIVATE_KEY` is missing.
- Business services do not query `database.js` directly. `systemHealthService` is the documented diagnostics exception.
- Performance, security, and test-quality reports are present under `backend/docs/`.

## Release snapshot
- Backend suites: `216`
- Backend tests: `815`
- Coverage: `Statements 82.15 / Branches 62.30 / Functions 81.93 / Lines 82.61`
- Fresh install smoke: `status: ready`
- Competition seed dry-run: `status: ready`
- Migration replay: `executed=0, skipped=29`
- Latest performance hotspot: `GET /time-bank/leaderboard` with `p95=214ms`

## Supporting documents
- `backend/docs/error-message-spec.md`
- `backend/docs/test-quality-report.md`
- `backend/docs/performance-audit-report.md`
- `backend/docs/security-audit-report.md`
- `backend/docs/live-cutover-handover.md`

## Remaining live-only work
- Fill real credentials for medical upstream, notification providers, voice providers, and OSS.
- Switch integrations from `stub-ready` to `live-ready verified` one by one.
- Capture desensitized live receipts and attach them to the real-data evidence pack.
- Rehearse the three defense stories with real providers enabled.
