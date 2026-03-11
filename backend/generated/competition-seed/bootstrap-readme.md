# Competition Seed Bootstrap

Generated at: 2026-03-11T07:34:07.808Z
Manifest version: 2026.03-competition-v2

## Commands

- `npm run seed:competition`
- `npm run seed:competition:export`
- `npm run seed:competition:sql`

## Import Order

1. users
2. community_admins
3. emergency_contacts
4. family_bindings
5. health_archives
6. medication_plans
7. medication_logs
8. location_records
9. sos_events
10. service_orders
11. volunteer_attendance_logs
12. time_accounts
13. service_records
14. exchange_records
15. online_consultations
16. appointments
17. medical_reports
18. audit_logs

## Counts

- users: 89
- community_admins: 3
- emergency_contacts: 36
- family_bindings: 36
- health_archives: 36
- medication_plans: 58
- medication_logs: 1740
- location_records: 3240
- sos_events: 18
- service_orders: 42
- volunteer_attendance_logs: 34
- time_accounts: 50
- service_records: 26
- exchange_records: 9
- online_consultations: 12
- appointments: 16
- medical_reports: 48
- audit_logs: 45

## Import Tip

- After running the SQL import, call `POST /admin/system/demo/bootstrap` to verify replay context and audit evidence.
- Re-run `npm run seed:competition:export` if you need the matching JSON reference set for defense materials.
