'use strict';

const COMPETITION_SEED_ASSETS = {
  outputDir: 'backend/generated/competition-seed',
  packageDir: 'backend/generated/competition-package',
  commands: [
    'npm run seed:competition',
    'npm run seed:competition:export',
    'npm run seed:competition:sql',
    'npm run seed:competition:package',
    'npm run seed:competition:apply',
    'npm run seed:competition:verify',
    'npm run seed:competition:refresh',
  ],
  files: {
    manifest: 'manifest.json',
    reference: 'reference-medical-directory.json',
    communities: 'communities.json',
    users: 'users.json',
    emergencyContacts: 'emergency-contacts.json',
    familyBindings: 'family-bindings.json',
    healthArchives: 'health-archives.json',
    medicationPlans: 'medication-plans.json',
    medicationLogs: 'medication-logs.json',
    gpsTracks: 'gps-tracks.json',
    sosEvents: 'sos-events.json',
    serviceOrders: 'service-orders.json',
    volunteerAttendanceLogs: 'volunteer-attendance-logs.json',
    serviceRecords: 'service-records.json',
    timeBankAccounts: 'time-bank-accounts.json',
    timeBankExchanges: 'time-bank-exchanges.json',
    consultations: 'consultations.json',
    appointments: 'appointments.json',
    medicalReports: 'medical-reports.json',
    auditLogs: 'audit-logs.json',
    summary: 'summary.json',
    bootstrapSql: 'bootstrap.sql',
    bootstrapReadme: 'bootstrap-readme.md',
    bootstrapSummary: 'bootstrap-summary.json',
    latestSnapshot: 'latest-db-snapshot.json',
    latestVerification: 'latest-verification.json',
    latestRefreshReport: 'latest-refresh-report.json',
  },
};

module.exports = {
  COMPETITION_SEED_ASSETS,
};
