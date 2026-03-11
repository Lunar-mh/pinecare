# Backend Hardening Roadmap

## Verified baseline on 2026-03-11

The following numbers are verified from the current repository state:

- Backend test suites: 147 passed out of 147
- Backend test cases: 581 passed out of 581
- Contract test files: 11
- Integration test files: 35
- Performance test files: 15
- Coverage summary from the latest full run:
  - statements: 70.94%
  - branches: 52.72%
  - functions: 71.22%
  - lines: 71.37%

These numbers must be updated only after a fresh full test run.

## P0 goals

P0 is now focused on reducing maintenance surface while keeping published behavior stable.

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
- Unified WeChat notify diagnostics and environment validation onto the shared runtime mode policy
- Added regression coverage for WeChat live-mode env validation and system integration diagnostics fields
- Centralized admin-side controller error mapping to reduce duplicated error envelopes
- Extended shared controller error handling to community-admin and volunteer backends
- Added route-level regression coverage for coded volunteer and community-admin business failures
- Removed the published legacy aliases for `/timebank`, `/location`, and `/companion`
- Moved admin and volunteer scope lookups behind a dedicated model instead of querying in middleware
- Moved `/health` dependency probing behind a dedicated service instead of querying in the route file
- Split `adminOpsService` into thin facade plus focused admin subservices for care overview, incidents, and diagnostics
- Split `communityAdminService` into thin facade plus focused community subservices for orders, activities, and care operations
- Split `medicalApiService` into thin facade plus focused internal modules for capability policy, catalog fetches, request orchestration, and stub data
- Split `timeBankService` into thin facade plus focused internal modules for account reads, service record workflows, exchange flows, and cache helpers
- Added architecture guardrail tests to keep retired aliases removed, keep DB/Redis out of route and middleware boundaries, and stop the new facades from regrowing into monoliths
- Raised Jest coverage thresholds to the current verified backend baseline

P0 still required:

- Publish one canonical path table for every backend module
- Freeze one global business error mapping policy across the remaining controllers
- Keep shrinking duplicate route/controller glue as compatibility paths are retired
- Continue splitting the next overweight services without rebuilding all-in-one facades elsewhere

Definition of done for P0:

- Every published OpenAPI path resolves in the running backend
- Every compatibility path is documented as either canonical or deprecated
- No retired compatibility path remains mounted in runtime routes
- Full test suite stays green

## P1 goals

P1 is about reducing backend weight while improving production intent.

Required work:

- Continue splitting large aggregation services when they mix multiple bounded contexts
- Keep route files and middleware thin and data-access free
- Continue replacing controller-local error mappers with the shared policy
- Raise coverage to at least 75% overall without growing large files further
- Push new work into small focused services instead of adding to all-in-one modules
- Drive the next reductions in `fallService`, `familyService`, `authService`, and `companionService`

Definition of done for P1:

- Production mode rejects missing live configuration instead of silently degrading
- Diagnostics expose `configured`, `effectiveMode`, `fallbackAllowed`, `healthy`, and `source`
- New code does not add another all-in-one service or controller
- Core domains have dedicated regression tests for error paths and compatibility paths
- Heaviest modules trend down in line count over time instead of up

## Guardrails

The following rules are mandatory for future backend changes:

- Route files only compose middleware and handlers
- Controllers only validate, orchestrate service calls, and map responses
- Services own business rules and state transitions
- Models are the only layer allowed to talk to the database adapter directly
- New deprecated paths must be documented at the time they are introduced
- New production flows must not default to stub, mock, or fake success paths
- New feature work must prefer deleting or extracting duplicate code over stacking logic into large files
- Facade services must stay thin and only delegate to focused subservices

## Release gate

A backend release candidate is acceptable only when all checks below pass:

- Full `npm test` is green
- Published contracts and runtime routes match
- Compatibility routes are documented and intentionally retained
- Integration diagnostics are truthful about data source and mode
- No warning-only quality gate is ignored for release
- No removed legacy path remains mounted in the running backend
