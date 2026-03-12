# Privacy Policy

## Version
- Version: 2026.03-live-defense
- Effective date: 2026-03-12
- Scope: backend services, admin operations, competition replay, and live-defense rehearsal

## Data categories
- Account data: phone, login identifiers, hashed credentials, role information
- Care data: health archive, medication plan, alerts, fall events, SOS events
- Medical data: appointments, online consultations, report summaries, directory queries
- Communication data: WeChat message receipts, SMS request identifiers, voice task identifiers
- Device and location data: GPS uploads, device bindings, geofence events

## Purpose of use
- Deliver core elderly-care features and emergency response workflows
- Provide authorized family, community, and operations views
- Produce desensitized replay evidence for contest defense and troubleshooting
- Monitor third-party availability, security, and auditability

## Retention and deletion
- Replay seed data is marked as contest baseline data and is not treated as live evidence
- Live evidence must be desensitized before screenshots, exports, or defense materials are shared
- Users can request account deletion through the existing backend deletion flow; associated audit data is retained only as required for security and contest traceability

## Security controls
- Sensitive fields are masked in logs and evidence exports
- Access tokens, upstream URLs with secrets, and raw medical links must never be exposed in API responses
- Administrative diagnostics are protected by auth and admin scope middleware
