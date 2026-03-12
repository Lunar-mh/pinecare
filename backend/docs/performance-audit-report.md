# Performance Audit Report

## Goal
Capture a repeatable non-live performance baseline for the backend before real-provider cutover.

## Benchmarked flows
- `/livez`
- `/readyz`
- `/admin/system/integrations`
- `/admin/system/evidence`
- `/admin/system/event-replay`
- `/time-bank/leaderboard`
- `/medical/reports`
- `POST /sos/trigger`

## Execution
```bash
npm run test:performance
npm run audit:performance
```

## Generated artifacts
- JSON baseline: `backend/generated/audits/performance/latest.json`
- Markdown baseline: `backend/generated/audits/performance/latest.md`

## Latest baseline snapshot
- `GET /time-bank/leaderboard`: `p95=214ms`, `max=218ms`
- `GET /readyz`: `p95=129ms`, `max=131ms`
- `GET /livez`: `p95=123ms`, `max=124ms`
- `GET /admin/system/integrations`: `p95=120ms`, `max=123ms`
- `GET /admin/system/evidence`: `p95=92ms`, `max=93ms`
- `GET /admin/system/event-replay`: `p95=84ms`, `max=85ms`
- `POST /sos/trigger`: `p95=6ms`, `max=42ms`
- `GET /medical/reports`: `p95=53ms`, `max=54ms`

## Hotspot handling rules
- Prefer low-risk wins: batched queries, bounded scans, lightweight caching, and timing instrumentation.
- Do not introduce silent fallback or weaken security to improve latency.
- Re-run the full performance audit after any change to diagnostics, replay, rate limiting, or provider runtime aggregation.

## Current baseline notes
- Baseline is captured in non-live mode with mocked or rehearsal-safe dependencies.
- The performance baseline is intended for relative comparison before and after live cutover, not as a production TPS claim.
- Event replay now uses a short-lived cache and batched fall notification loading to reduce repeated aggregation work.
