# Performance Audit Report

Generated at: 2026-03-12T10:53:16.298Z

| Name | p50 | p95 | p99 | max | Metadata |
| --- | ---: | ---: | ---: | ---: | --- |
| admin-integrations | 104ms | 120ms | 123ms | 123ms | endpoint=GET /admin/system/integrations; concurrency=80; sqlCount=0; redisHits=0; fallbackTriggered=false |
| admin-evidence | 89ms | 92ms | 93ms | 93ms | endpoint=GET /admin/system/evidence; concurrency=80; sqlCount=0; redisHits=0; fallbackTriggered=false |
| admin-event-replay | 79ms | 84ms | 85ms | 85ms | endpoint=GET /admin/system/event-replay; concurrency=80; sqlCount=0; redisHits=0; fallbackTriggered=false |
| system-livez | 114ms | 123ms | 124ms | 124ms | endpoint=GET /livez; concurrency=120; sqlCount=0; redisHits=0; fallbackTriggered=false |
| system-readyz | 123ms | 129ms | 130ms | 131ms | endpoint=GET /readyz; concurrency=120; sqlCount=1; redisHits=1; fallbackTriggered=false |
| time-bank-leaderboard | 188ms | 214ms | 216ms | 218ms | endpoint=GET /time-bank/leaderboard; concurrency=200; sqlCount=0; redisHits=0; fallbackTriggered=false; processing={"count":200,"p50":12,"p95":12,"p99":12,"max":12}; non200=0 |
| sos-trigger | 4ms | 6ms | 42ms | 42ms | endpoint=POST /sos/trigger; rounds=30; sqlCount=1; redisHits=0; fallbackTriggered=false |
| medical-reports | 49ms | 53ms | 54ms | 54ms | endpoint=GET /medical/reports; concurrency=50; sqlCount=0; redisHits=0; fallbackTriggered=true; processing={"count":50,"p50":0.0051,"p95":0.0137,"p99":0.0306,"max":0.0306}; failedRequests=0 |

## Hotspots

1. time-bank-leaderboard (p95=214ms, max=218ms)
2. system-readyz (p95=129ms, max=131ms)
3. system-livez (p95=123ms, max=124ms)
4. admin-integrations (p95=120ms, max=123ms)
5. admin-evidence (p95=92ms, max=93ms)

## Notes

- Baseline is captured in non-live mode with mocked or rehearsal-safe dependencies.
- Use this report for comparison before and after live-provider cutover.
