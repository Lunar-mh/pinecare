# Backend Hardening Roadmap

## Verified baseline on 2026-03-11

The following numbers are verified from the current repository state:

- Backend test suites: 116 passed out of 116
- Backend test cases: 457 passed out of 457
- Contract test files: 10
- Integration test files: 34
- Performance test files: 15
- Coverage summary from the latest full run:
  - statements: 57.87%
  - branches: 41.75%
  - functions: 60.00%
  - lines: 58.20%

These numbers must be updated only after a fresh full test run.

## P0 goals

P0 is about removing protocol drift and making production intent explicit.

Done in this change set:

- Exposed health archive APIs on the spec-compatible `/health/*` prefix while preserving infra health check at `/health`
- Added a spec-compatible `/device/*` route entry for device binding operations
- Exposed family-space APIs on the spec-compatible `/family/*` prefix
- Marked `/health-archive/*` and `/family-space/*` as deprecated compatibility paths with successor headers
- Added contract tests for the new `/health`, `/device`, and `/family` contract paths
- Added parity regression tests to keep canonical and compatibility routes behaviorally aligned
- Reworked time-bank, AI consult, AI companion, health archive, and fall-report performance tests so they measure successful in-process responses instead of external localhost state
- Unified `/community`, `/admin`, `/admin/users`, and `/statistics` onto middleware-level `adminAuth` instead of controller-local admin checks
- Moved legacy admin route authorization assertions into route-level regression coverage

P0 still required:

- Publish one canonical path table for every backend module
- Add deprecation headers for old compatibility routes that are no longer canonical
- Freeze one global business error mapping policy
- Decide whether remaining legacy admin entry points stay for one deprecation cycle or are retired immediately

Definition of done for P0:

- Every published OpenAPI path resolves in the running backend
- Every compatibility path is documented as either canonical or deprecated
- No production path silently falls back to mock or stub mode by default
- Full test suite stays green

## P1 goals

P1 is about making live integrations the default and reducing maintenance risk.

Required work:

- Introduce a single runtime mode policy for live, stub, mock, and sandbox decisions
- Make AI, voice, OSS, and medical integrations live-first
- Add request id, timeout, retry, circuit-break, and audit data to external integrations
- Split large aggregation services when they mix multiple bounded contexts
- Raise coverage to at least 70% overall

Definition of done for P1:

- Production mode rejects missing live configuration instead of silently degrading
- Diagnostics expose `configured`, `effectiveMode`, `fallbackAllowed`, `healthy`, and `source`
- New code does not add another all-in-one service or controller
- Core domains have dedicated regression tests for error paths and compatibility paths

## P2 goals

P2 is about award-grade polish and replayable demonstrations.

Required work:

- Prepare replayable competition datasets and scripts for all critical chains
- Add more performance baselines for admin aggregation, SOS notification fan-out, medical sync, family overview aggregation, and voice polling
- Push key domain coverage above 80% for auth, SOS, medication, time bank, and medical integration
- Add operator-facing dashboards or diagnostics that can support live demos and post-demo troubleshooting

Definition of done for P2:

- Demo data can be restored and verified from scripts
- Core chains are reproducible without manual database fixes
- Performance thresholds are versioned and enforced in CI
- No undocumented technical debt remains open for release candidates

## Execution order

1. Finish all remaining P0 drift fixes and document canonical paths.
2. Unify runtime mode strategy before touching more feature code.
3. Move external integrations to live-first with explicit diagnostics.
4. Raise coverage and add performance baselines for the highest-risk chains.
5. Freeze replay scripts and release checklists for competition and staging use.

## Guardrails

The following rules are mandatory for future backend changes:

- Route files only compose middleware and handlers
- Controllers only validate, orchestrate service calls, and map responses
- Services own business rules and state transitions
- Models are the only layer allowed to talk to the database adapter directly
- New deprecated paths must be documented at the time they are introduced
- New production flows must not default to stub, mock, or fake success paths

## Release gate

A backend release candidate is acceptable only when all checks below pass:

- Full `npm test` is green
- Published contracts and runtime routes match
- Compatibility routes are documented and intentionally retained
- Integration diagnostics are truthful about data source and mode
- No warning-only quality gate is ignored for release

