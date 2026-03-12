# Backend Knowledge Base

Updated: 2026-03-12
State: non-live release candidate (`stub-ready / live-ready`)

## Scope
`backend/` is the Express REST API for the Yinban smart elderly care platform. The backend is frozen at the stage where the remaining work is limited to real credentials, real upstream endpoints, and live evidence rehearsal.

## Core guarantees
- Dual route prefixes: `/api/v1` and `/`
- Standard response envelope: `{ code, message, data }`
- English backend debug messages with client-side localization by `code` or `statusCode`
- Unified provider runtime metadata and evidence endpoints
- Unified care-event timeline and replay flow
- Fresh-install, migration, and competition-seed smoke coverage

## Layering rules
- Controllers call services only.
- Business services call models only.
- Models are the only layer allowed to access `database.js`.
- `systemHealthService is the documented diagnostics exception` and may query the database directly for readiness, liveness, and observability checks.
- Business services must not call `query()` directly.

## Security rules
- Signing, authentication, and receipt generation must fail closed.
- `HASH_SECRET` and `PLATFORM_PRIVATE_KEY` are required for signing flows.
- Default secrets or predictable secret fallbacks are forbidden.
- Third-party errors must go through the shared logger and sanitized runtime buffers.
- Sensitive values such as tokens, phone numbers, government identifiers, and receipt URLs must stay desensitized in logs and evidence payloads.

## Evidence and diagnostics endpoints
- `/admin/system/integrations`
- `/admin/system/evidence`
- `/admin/system/event-replay`
- `/readyz`
- `/livez`

## Default rehearsal baseline
- Backend host: `http://127.0.0.1:3001`
- Host-side MySQL rehearsal port: `127.0.0.1:13307`
- Host-side direct `3000` access is allowed only via explicit environment overrides.

## Required backend commands
```bash
npm run lint
npm test -- --silent
npm run test:security
npm run test:performance
npm run audit:performance
npm run migrate
npm run smoke:fresh-install
npm run seed:competition:verify -- --dry-run
```

## Coverage floor
- Statements >= 80
- Branches >= 60
- Functions >= 80
- Lines >= 80

## Narrative boundary
- Medical, notification, voice, and OSS integrations are described as `stub-ready / live-ready` until real credentials are attached and verified.
- `competition seed` is rehearsal baseline data, not live production evidence.
- Neo4j and knowledge graph are not part of the current release narrative unless they become real, diagnosable capabilities.
