# Defense Evidence Checklist

## Purpose
This checklist defines the minimum evidence package for defense rehearsal and for the final live cutover stage.

## Story 1: SOS, fall, and GPS event chain
- Trigger source:
  - `POST /api/v1/sos/trigger`
  - `POST /api/v1/fall-detection/report`
  - `POST /api/v1/gps/locations`
- Verification outputs:
  - `/api/v1/admin/system/event-replay?userId=<demoUserId>` shows the timeline
  - `/api/v1/admin/system/evidence` shows notification and integration state
  - `/api/v1/admin/system/integrations` shows current `requestedMode`, `effectiveMode`, `liveConfigured`, `fallbackAllowed`
- Evidence to capture:
  - replay timeline screenshot
  - event id or audit id
  - masked notification receipt or fallback explanation
  - handling result and resolver identity

## Story 2: Medical directory and appointment
- Trigger source:
  - `GET /api/v1/medical/directory`
  - appointment creation route used by the current medical service flow
- Verification outputs:
  - `/api/v1/admin/system/integrations`
  - `/api/v1/admin/system/evidence`
- Evidence to capture:
  - directory result screenshot with masked doctor or hospital identifiers
  - appointment creation response or masked record id
  - `requestedMode`, `effectiveMode`, `lastSuccessAt`, `lastError`

## Story 3: Volunteer task execution
- Trigger source:
  - `/api/v1/volunteer/profile`
  - `/api/v1/volunteer/tasks`
  - `/api/v1/volunteer/tasks/:taskId/accept`
  - `/api/v1/volunteer/tasks/:taskId/check-in`
  - `/api/v1/volunteer/tasks/:taskId/check-out`
  - `/api/v1/volunteer/tasks/:taskId/complete`
- Verification outputs:
  - volunteer task list response
  - admin-side replay or community handling evidence
- Evidence to capture:
  - task id, volunteer id, task state transitions
  - masked timestamps for accept, check-in, check-out, and completion
  - backend replay or admin-side state sync screenshot

## Live-ready capability evidence
### Notification
- Verify via `/api/v1/admin/system/integrations` and `/api/v1/admin/system/evidence`
- Capture request id, receipt id, and `lastSuccessAt`

### Voice
- Verify via `/api/v1/admin/system/integrations`
- Capture request trace, task id, or provider reference

### OSS
- Verify via `/api/v1/admin/system/integrations`
- Capture masked object key or upload request id

## Documentation bundle
- `backend/docs/error-message-spec.md`
- `backend/docs/live-cutover-handover.md`
- `backend/docs/real-data-evidence-pack.md`
- `backend/docs/live-evidence-templates.md`
- `backend/docs/four-end-release-candidate.md`

## Separation rule
- Competition seed data is baseline demo data only.
- Real provider receipts must be documented separately.
- Any capability still in fallback must be labeled `stub-ready` or `fallback`, never `live`.
