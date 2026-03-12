# Deployment And Defense Playbook

## Goal
Prepare a reproducible four-end release candidate for defense rehearsal and national judging. The current release candidate is designed to be `stub-ready / live-ready`: it is complete without real upstreams, and the remaining work is limited to replacing credentials and switching providers to live mode.

## Preflight
- Copy `backend/.env.example` or `.env.production-live.example` to `backend/.env` according to the rehearsal mode.
- Use `PRODUCTION_LIVE=1` only when real credentials are available.
- Confirm MySQL, Redis, and the worker role are reachable from the target host.
- For local host rehearsal, align scripts to `127.0.0.1:13307` unless an explicit production DB port is configured.
- Ensure the mini program, admin, and volunteer builds are generated from a clean install before final rehearsal.

## Verified commands
### Backend
- `npm install`
- `npm run lint`
- `npm test`
- `npm run smoke:fresh-install`
- `npm run seed:competition:verify -- --dry-run`
- `npm run migrate`
- `npm start`

### Frontend
- `npm ci`
- `npm run typecheck`
- `npm run build:weapp`

### Admin
- `npm ci`
- `npm run build`

### Volunteer
- `npm ci`
- `npm run typecheck`
- `npm run build`

## Runtime checks
### Backend health
- `GET /health`
- `GET /ready`
- `GET /api/v1/admin/system/integrations`
- `GET /api/v1/admin/system/evidence`
- `GET /api/v1/admin/system/event-replay?userId=<demoUserId>`

### Release candidate expectations
- Admin consumes evidence and replay interfaces directly.
- Volunteer runs on API-driven task flows instead of static demo content.
- Mini program core entries no longer show unfinished placeholder text.
- Competition seed verification artifacts exist in `generated/competition-seed/`.

## Defense stories
1. Event story: `SOS / fall / GPS` anomaly -> notification -> community handling -> replay evidence.
2. Medical story: doctor directory -> appointment creation -> evidence page with mode, last success, and recent error.
3. Volunteer story: task appears -> accept -> check-in -> check-out -> complete -> backend state sync.

## Rollback-safe steps
- Stop only the API node first.
- Keep the worker node isolated if medication and SOS jobs must continue.
- Restore the previous `.env` and restart API plus worker.
- Recheck `/ready` and `/admin/system/integrations` after rollback.

## Related documents
- `backend/docs/four-end-release-candidate.md`
- `backend/docs/compliance-and-contest-package.md`
- `backend/docs/real-data-evidence-pack.md`
