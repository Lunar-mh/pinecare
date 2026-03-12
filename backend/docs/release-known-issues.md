# Release Known Issues

## Current known issues
### Frontend CSS order warning
- Symptom: `mini-css-extract-plugin` may report a CSS order warning during `npm run build:weapp`.
- Impact: build still succeeds, output is generated, and the warning does not block defense rehearsal or runtime behavior.
- Status: accepted for the current non-live release candidate.
- Follow-up: can be cleaned later by refactoring import order, but it is not required for live cutover.

### Local environment override drift
- Symptom: a developer-local `.env` may still point to older host ports such as `3307`.
- Impact: repository defaults are already aligned to `13307`, but local dry-run output may reflect the developer override.
- Status: known local configuration issue, not a repository baseline issue.
- Follow-up: update local private `.env` before final live rehearsal.

### Neo4j placeholder implementation
- Symptom: `backend/src/config/neo4j.js` is a no-op placeholder.
- Impact: Neo4j is not part of the current release candidate capability set.
- Status: removed from release narrative.
- Follow-up: only reintroduce it after a real implementation and diagnostic coverage are added.
