# Backend Canonical Contract V1

## Purpose

This document freezes the canonical backend route map for the current repository state.
It is the single source of truth for:
- canonical public paths
- deprecated compatibility paths
- legacy aliases that remain only for one deprecation cycle
- admin and community route ownership

## Canonical Public Paths

- `001 user auth`
  - canonical: `/auth/*`, `/user/profile`, `/user/emergency-contacts/*`, `/user/binding/*`, `/user/account/delete`, `/user/unlock`
  - compatibility: `/user/info`, `/user/emergency-contacts/:id/delete`
- `002 health archive`
  - canonical: `/health/*`, `/device/*`
  - compatibility: `/health-archive/*`, `/health-archive/device/*`
- `003 medication reminder`
  - canonical: `/medication/*`
- `004 emergency sos`
  - canonical: `/sos/*`
- `005 family app`
  - canonical: `/family/bindings`, `/family/elderly-overview`, `/family/notifications/*`
- `006 voice interaction`
  - canonical: `/voice/*`
- `007 fall detection`
  - canonical: `/fall-detection/*`
- `008 ai health advice`
  - canonical: `/ai-consult/*`
- `009 drug interaction`
  - canonical: `/drug-interaction/*`
- `010 time bank`
  - canonical: `/time-bank/*`
  - compatibility: `/timebank/*`
- `011 ai companion`
  - canonical: `/ai-companion/*`
  - compatibility: `/companion/*`
- `012 family space`
  - canonical: `/family/message/*`, `/family/album/*`, `/family/points`, `/family/leaderboard`
  - compatibility: `/family-space/*`
- `013 community admin`
  - canonical: `/community/*`
  - deprecated compatibility: `/admin/*`, `/statistics/*`
- `014 gps tracking`
  - canonical: `/gps/*`
  - compatibility: `/location/*`
- `015 medical integration`
  - canonical: `/medical/*`

## Canonical Admin Scope

Community-scoped business operations belong to `/community/*`.
The following `/admin/*` paths are compatibility aliases only and must emit deprecation headers:
- `/admin/health/overview`
- `/admin/medication/logs`
- `/admin/medication/logs/:logId/status`
- `/admin/gps/current`
- `/admin/gps/trail`
- `/admin/family/bindings`
- `/admin/medical/reports`
- `/admin/sos/events`
- `/admin/sos/events/:eventId/status`
- `/admin/fall/events`
- `/admin/drug-interactions`
- `/admin/drug-interactions/:interactionId/status`
- `/admin/time-bank/service/history`
- `/admin/time-bank/service/confirm`
- `/admin/time-bank/exchange/history`
- `/admin/time-bank/leaderboard`

System-only admin routes stay under `/admin/system/*`:
- `/admin/system/integrations`
- `/admin/system/audit-logs`
- `/admin/system/demo/scenarios`
- `/admin/system/demo/bootstrap`

## Compatibility Policy

Every compatibility path must satisfy all of the rules below:
- it resolves in the running backend
- it returns the same business payload as the canonical path
- it emits deprecation headers with the canonical successor path
- it must not become the default path in docs, client code, or new tests

## Legacy Aliases Retained For One Cycle

The following legacy aliases remain intentionally, but must not be used for new development:
- `/timebank/*` -> `/time-bank/*`
- `/location/*` -> `/gps/*`
- `/companion/*` -> `/ai-companion/*`
- `/health-archive/*` -> `/health/*`
- `/family-space/*` -> `/family/*`
- `/admin/*` business routes -> `/community/*`
- `/statistics/*` -> `/community/stats`
- `/user/info` -> `/user/profile`

## Response Contract

All endpoints must return the unified envelope:
- success: `{ code: 0, message: string, data: any }`
- failure: `{ code: http_code, message: string, data: null | object }`

## Governance Rules

- Route files only compose middleware and handlers.
- Controllers only validate input, call services, and map responses.
- Services own business rules, runtime mode rules, and state transitions.
- Models are the only layer allowed to talk to the database adapter directly.
- New compatibility paths must be documented in this file on the same change set.
- New production paths must not silently fall back to stub or mock mode.
