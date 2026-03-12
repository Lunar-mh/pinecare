# Test Quality Report

## Goal
Keep the backend above the release coverage floor while increasing confidence on high-risk paths that judges are likely to inspect.

## Current snapshot
- Full backend suites: `216`
- Full backend tests: `815`
- Coverage: `Statements 82.15 / Branches 62.30 / Functions 81.93 / Lines 82.61`
- Release baseline commands passed: `lint`, full `test`, `test:security`, `test:performance`, `audit:performance`, `smoke:fresh-install`, `seed:competition:verify -- --dry-run`, `migrate`

## Current quality focus
- Controller boundary coverage for SOS, volunteer, health, location, medical, and time bank routes
- Middleware rejection paths for authentication, admin scope, family access, validation, and rate limiting
- Job resilience for medication reminder, follow-up, worker lifecycle, and unified care-event replay
- Contract stability for diagnostics, evidence, replay, provider runtime metadata, and fail-closed signing

## Regression matrix
- Base release commands: `lint`, full `test`, `migrate`, `smoke:fresh-install`, `seed:competition:verify -- --dry-run`
- Security suite: `npm run test:security`
- Performance suite: `npm run test:performance`
- Full performance audit output: `npm run audit:performance`

## Remaining thin spots
- Some legacy model-heavy modules still rely more on integration coverage than direct branch tests.
- Performance suites in non-live mode are rehearsal-safe and do not replace real-provider stress tests.
- Controller coverage is now defense-ready, but live-provider cutover should still be followed by one more round of focused regression.

## Acceptance rule
A backend release candidate is considered test-ready only when the full regression stack remains green and coverage does not drop below the global floor.
