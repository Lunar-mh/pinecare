'use strict';

const fs = require('fs');
const path = require('path');
const { buildCompetitionSeedDataset } = require('../src/data/competitionSeedDataset');

const OUTPUT_DIR = path.join(__dirname, '..', 'generated', 'competition-seed');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filename, data) {
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function buildSummary(dataset) {
  return {
    generatedAt: new Date().toISOString(),
    outputDir: OUTPUT_DIR,
    files: {
      manifest: 'manifest.json',
      reference: 'reference-medical-directory.json',
      communities: 'communities.json',
      users: 'users.json',
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
    },
    counts: {
      communities: dataset.communities.length,
      communityAdmins: dataset.communityAdmins.length,
      volunteers: dataset.volunteers.length,
      elders: dataset.elders.length,
      familyMembers: dataset.familyMembers.length,
      familyBindings: dataset.familyBindings.length,
      healthArchives: dataset.healthArchives.length,
      medicationPlans: dataset.medicationPlans.length,
      medicationLogs: dataset.medicationLogs.length,
      gpsTracks: dataset.gpsTracks.length,
      sosEvents: dataset.sosEvents.length,
      serviceOrders: dataset.serviceOrders.length,
      volunteerAttendanceLogs: dataset.volunteerAttendanceLogs.length,
      serviceRecords: dataset.serviceRecords.length,
      timeBankAccounts: dataset.timeBankAccounts.length,
      timeBankExchanges: dataset.timeBankExchanges.length,
      consultations: dataset.consultations.length,
      appointments: dataset.appointments.length,
      medicalReports: dataset.medicalReports.length,
    },
  };
}

function main() {
  const dataset = buildCompetitionSeedDataset();
  ensureDir(OUTPUT_DIR);

  const users = [
    ...dataset.communityAdmins,
    ...dataset.volunteers,
    ...dataset.elders,
    ...dataset.familyMembers,
  ];

  writeJson('manifest.json', dataset.manifest);
  writeJson('reference-medical-directory.json', dataset.reference);
  writeJson('communities.json', dataset.communities);
  writeJson('users.json', users);
  writeJson('family-bindings.json', dataset.familyBindings);
  writeJson('health-archives.json', dataset.healthArchives);
  writeJson('medication-plans.json', dataset.medicationPlans);
  writeJson('medication-logs.json', dataset.medicationLogs);
  writeJson('gps-tracks.json', dataset.gpsTracks);
  writeJson('sos-events.json', dataset.sosEvents);
  writeJson('service-orders.json', dataset.serviceOrders);
  writeJson('volunteer-attendance-logs.json', dataset.volunteerAttendanceLogs);
  writeJson('service-records.json', dataset.serviceRecords);
  writeJson('time-bank-accounts.json', dataset.timeBankAccounts);
  writeJson('time-bank-exchanges.json', dataset.timeBankExchanges);
  writeJson('consultations.json', dataset.consultations);
  writeJson('appointments.json', dataset.appointments);
  writeJson('medical-reports.json', dataset.medicalReports);

  const summary = buildSummary(dataset);
  writeJson('summary.json', summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
