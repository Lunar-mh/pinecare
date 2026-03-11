'use strict';

const { COMPETITION_SEED_MANIFEST } = require('./competitionSeedManifest');

function buildExpectedTableCounts() {
  return {
    users:
      COMPETITION_SEED_MANIFEST.coverage.communityAdmins +
      COMPETITION_SEED_MANIFEST.coverage.volunteers +
      COMPETITION_SEED_MANIFEST.coverage.elders +
      COMPETITION_SEED_MANIFEST.coverage.familyMembers,
    community_admins: COMPETITION_SEED_MANIFEST.coverage.communityAdmins,
    emergency_contacts: COMPETITION_SEED_MANIFEST.coverage.emergencyContacts,
    family_bindings: COMPETITION_SEED_MANIFEST.coverage.familyMembers,
    health_archives: COMPETITION_SEED_MANIFEST.coverage.healthArchives,
    medication_plans: COMPETITION_SEED_MANIFEST.coverage.medicationPlans,
    medication_logs: COMPETITION_SEED_MANIFEST.coverage.medicationLogs30d,
    location_records: COMPETITION_SEED_MANIFEST.coverage.gpsTrailPoints30d,
    sos_events: COMPETITION_SEED_MANIFEST.coverage.sosEvents,
    service_orders: COMPETITION_SEED_MANIFEST.coverage.serviceOrders,
    volunteer_attendance_logs: 34,
    time_accounts: COMPETITION_SEED_MANIFEST.coverage.timeBankAccounts,
    service_records: COMPETITION_SEED_MANIFEST.coverage.serviceRecords,
    exchange_records: COMPETITION_SEED_MANIFEST.coverage.timeBankExchanges,
    online_consultations: COMPETITION_SEED_MANIFEST.coverage.consultations,
    appointments: COMPETITION_SEED_MANIFEST.coverage.appointments,
    medical_reports: COMPETITION_SEED_MANIFEST.coverage.medicalReports,
    audit_logs: COMPETITION_SEED_MANIFEST.coverage.auditLogs,
  };
}

function buildChainChecks() {
  return [
    {
      id: 'A',
      description: 'elder today summary chain has elder -> archive -> medication plan -> medication log',
      sql: `SELECT COUNT(*) AS cnt
            FROM health_archives ha
            INNER JOIN medication_plans mp ON mp.user_id = ha.user_id
            INNER JOIN medication_logs ml ON ml.plan_id = mp.id
            WHERE ha.user_id BETWEEN 7001 AND 7999`,
      expectedMin: 1,
    },
    {
      id: 'B',
      description: 'sos response chain has closed events and related audit logs',
      sql: `SELECT COUNT(*) AS cnt
            FROM sos_events e
            INNER JOIN audit_logs a ON a.action IN ('community.sos.confirm', 'community.sos.resolve', 'community.sos.cancel')
            WHERE e.event_status IN ('confirmed', 'resolved', 'cancelled')`,
      expectedMin: 1,
    },
    {
      id: 'C',
      description: 'family guard chain has approved binding plus location evidence',
      sql: `SELECT COUNT(*) AS cnt
            FROM family_bindings fb
            INNER JOIN location_records lr ON lr.user_id = fb.elder_user_id
            WHERE fb.binding_status = 'approved'`,
      expectedMin: 1,
    },
    {
      id: 'D',
      description: 'volunteer settlement chain has completed order -> attendance -> service record -> time account',
      sql: `SELECT COUNT(*) AS cnt
            FROM service_orders so
            INNER JOIN volunteer_attendance_logs val ON val.order_id = so.id
            INNER JOIN service_records sr ON sr.provider_id = val.volunteer_user_id AND sr.recipient_id = so.elder_id
            INNER JOIN time_accounts ta ON ta.user_id = val.volunteer_user_id
            WHERE so.status = 'completed'`,
      expectedMin: 1,
    },
    {
      id: 'E',
      description: 'medical chain has consultation, appointment and report rows for seeded elders',
      sql: `SELECT COUNT(*) AS cnt
            FROM online_consultations oc
            INNER JOIN appointments ap ON ap.user_id = oc.user_id
            INNER JOIN medical_reports mr ON mr.user_id = oc.user_id
            WHERE oc.user_id BETWEEN 7001 AND 7999`,
      expectedMin: 1,
    },
  ];
}

module.exports = {
  buildExpectedTableCounts,
  buildChainChecks,
};
