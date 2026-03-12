# Security Audit Report

## Goal
Verify that the non-live release candidate keeps strict backend security boundaries before real-provider cutover.

## Priority model
- `P1`: signing/auth fail-open, authorization bypass, sensitive data leakage, predictable secrets
- `P2`: business service direct database access, logging gaps, runtime message pollution, observability inconsistency
- `P3`: maintainability or guardrail deviations without an immediate exploit path

## Current audit snapshot
- Dedicated security suite: passed
- Full backend regression: passed
- Fresh install smoke: `status: ready`
- Competition seed dry-run: `status: ready`
- Migration replay: `executed=0, skipped=29`

## Verified hardening items
- `credentialService` and platform signing fail closed when secure secrets are missing.
- Time bank settlement uses explicit scoped secrets instead of predictable defaults.
- Third-party runtime errors are sanitized and routed through the shared logger.
- Business services avoid direct `query()` access; `systemHealthService` remains the explicit diagnostics exception.
- Authentication, admin scope, family access, rate limiting, and request validators have rejection-path coverage.
- Sensitive diagnostics remain desensitized in provider runtime and evidence outputs.
- High-risk routes now carry explicit rate limiting for SOS, voice, medical, admin diagnostics, and authentication flows.

## Live cutover prerequisites
- Provide `HASH_SECRET` and `PLATFORM_PRIVATE_KEY` before enabling any signed live flow.
- Re-run `npm run test:security` after attaching real credentials.
- Verify `/admin/system/integrations` and `/admin/system/evidence` for sanitized recent errors and live runtime status.

## Residual risk boundary
- Non-live rehearsal does not replace provider-side penetration testing.
- Local developer `.env` overrides can still mask repository defaults; confirm the effective runtime configuration before defense rehearsal.
