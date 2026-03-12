# Backend Deployment Playbook

## Goal
Prepare a reproducible backend deployment for defense rehearsal and national judging.

## Preflight
- Copy `.env.production-live.example` to `.env` for live rehearsal.
- Use `PRODUCTION_LIVE=1` only when real credentials are available.
- Confirm MySQL, Redis, and the worker role are reachable from the target host.
- For local host rehearsal, align scripts to `127.0.0.1:13307` unless an explicit production DB port is configured.

## Commands
- `npm install`
- `npm run lint`
- `npm test`
- `npm run smoke:fresh-install`
- `npm run seed:competition:verify -- --dry-run`
- `npm run migrate`
- `npm start`

## Runtime checks
- `GET /health`
- `GET /ready`
- `GET /api/v1/admin/system/integrations`
- `GET /api/v1/admin/system/evidence`
- `GET /api/v1/admin/system/event-replay?userId=<demoUserId>`

## Live-demo checklist
- Medical directory and appointment work with real upstream credentials.
- At least three integrations report `effectiveMode=live` and `healthy=true`.
- SOS queue is empty or stable before defense.
- Competition seed verification artifacts exist in `generated/competition-seed/`.

## Rollback-safe steps
- Stop only the API node first.
- Keep the worker node isolated if medication and SOS jobs must continue.
- Restore the previous `.env` and restart API plus worker.
- Recheck `/ready` and `/admin/system/integrations` after rollback.
