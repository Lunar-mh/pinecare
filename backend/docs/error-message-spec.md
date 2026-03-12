# Error Code And Message Specification

## Purpose
This document freezes the backend-facing message contract for the non-live release candidate.

## Contract rules
- Backend responses continue to use `{ code, message, data }`.
- Backend `message` is an English business or diagnostic string.
- Backend `message` is for debugging, audit, and developer tooling. It is not a user-facing localization source.
- Client applications must not display backend `message` directly to end users.
- Frontend, admin, and volunteer clients must map `code` or `statusCode` to localized user-facing messages.
- `debugMessage` may preserve the raw backend `message` for logs, troubleshooting, and developer tools.
- Backend runtime messages must stay readable, stable, and free of garbled or mixed-encoding content.

## Route validation vs service failure
- Route validation failures return deterministic validation messages in English.
- Service-layer business failures return deterministic business messages in English.
- Third-party upstream failures are normalized through shared upstream error helpers before they reach controllers.
- The same feature must not expose multiple conflicting messages for the same failure path.

## Security-sensitive configuration failures
| Scenario | Code | Backend message |
| --- | --- | --- |
| Missing generic signing secret | `503` | `HASH_SECRET is required for signature generation.` |
| Missing platform signing secret | `503` | `PLATFORM_PRIVATE_KEY is required for platform signature generation.` |
| Missing voice credentials | `500` | `Voice service requires env vars: ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET.` |

## Core code mapping
| Code | Meaning | Client-facing guidance |
| --- | --- | --- |
| `400` | Invalid request or missing required fields | Show localized "input invalid" message |
| `401` | Authentication expired or missing | Clear token and redirect to login |
| `403` | Permission denied | Show localized no-permission message |
| `404` | Resource not found | Show localized missing-resource message |
| `409` | Resource state conflict | Ask user to refresh and retry |
| `422` | Semantic validation failed | Show localized correction-needed message |
| `429` | Rate limit hit | Show localized retry-later message |
| `500` | Internal fallback or uncoded failure | Show localized generic failure message |
| `503` | Downstream unavailable or required secure config missing | Show localized service-unavailable message |
| `504` | Upstream timeout | Show localized timeout/service-unavailable message |

## Domain message table
### Health
| Scenario | Code | Backend message |
| --- | --- | --- |
| Load today overview success | `0` | `Health overview loaded.` |
| Load trend success | `0` | `Health trend loaded.` |
| Sync success | `0` | `Health data synced.` |
| Manual record success | `0` | `Manual health record saved.` |
| Missing `metric_type` | `400` | `metric_type is required.` |
| Missing `period` | `400` | `period is required.` |
| Generic load failure | `500` | `Failed to load health overview.` or operation-specific default |

### Medication
| Scenario | Code | Backend message |
| --- | --- | --- |
| Load plan list success | `0` | `Medication plans loaded.` |
| Load today schedule success | `0` | `Today medication schedule loaded.` |
| Confirm success | `0` | `Medication confirmation completed.` |
| Confirm idempotent success | `0` | `Medication log already confirmed.` |
| Load settings success | `0` | `Medication settings loaded.` |
| Update settings success | `0` | `Medication settings updated.` |
| Load history calendar success | `0` | `Medication history loaded.` |
| Invalid month | `400` | `month must use YYYY-MM format.` |
| Generic history failure | `500` | `Failed to load medication history calendar.` |

### SOS
| Scenario | Code | Backend message |
| --- | --- | --- |
| Trigger success | `0` | `SOS event created.` |
| Cancel success | `0` | `SOS event canceled.` |
| Confirm success | `0` | `SOS event confirmed.` |
| Resolve success | `0` | `SOS event resolved.` |
| History success | `0` | `SOS history loaded.` |
| Generic cancel failure | `500` | `Failed to cancel SOS event.` |
| Generic resolve failure | `500` | `Failed to resolve SOS event.` |

### Volunteer
| Scenario | Code | Backend message |
| --- | --- | --- |
| Load profile success | `0` | `Volunteer profile loaded.` |
| Load tasks success | `0` | `Volunteer tasks loaded.` |
| Accept task success | `0` | `Volunteer task accepted.` |
| Check in success | `0` | `Volunteer task checked in.` |
| Check out success | `0` | `Volunteer task checked out.` |
| Complete task success | `0` | `Volunteer task completed.` |
| Load training success | `0` | `Volunteer training records loaded.` |
| Generic tasks failure | `500` | `Failed to load volunteer tasks.` |

### Medical
| Scenario | Code | Backend message |
| --- | --- | --- |
| Load directory success | `0` | `Medical directory loaded.` |
| Load reports success | `0` | `Medical reports loaded.` |
| Create online consultation success | `0` | `Online consultation created.` |
| Load consultation history success | `0` | `Online consultation history loaded.` |
| Update consultation status success | `0` | `Online consultation status updated.` |
| Generic report failure | `500` | `Failed to load medical reports.` |
| Generic consultation create failure | `500` | `Failed to create online consultation.` |

### Time bank
| Scenario | Code | Backend message |
| --- | --- | --- |
| Load account success | `0` | `Time bank account loaded.` |
| Load balance success | `0` | `Time bank balance loaded.` |
| Record service success | `0` | `Volunteer service recorded.` |
| Confirm service success | `0` | `Time bank record settled.` |
| Load history success | `0` | `Time bank history loaded.` |
| Create exchange success | `0` | `Time bank exchange created.` |
| Load leaderboard success | `0` | `Time bank leaderboard loaded.` |
| Generic history failure | `500` | `Failed to load time bank history.` |

## Client localization rule
- The mini-program, admin console, and volunteer client must localize by `code` or `statusCode`.
- Raw backend `message` should be stored only as `debugMessage` for debugging.
- New backend handlers must not introduce Chinese and English mixed messages for the same route family.
