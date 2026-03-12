'use strict';

const fs = require('fs');
const path = require('path');
const { buildCompetitionSeedDataset } = require('../src/data/competitionSeedDataset');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'generated', 'competition-seed');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(outputDir, filename, data) {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function buildSummary(dataset, outputDir) {
  return {
    generatedAt: new Date().toISOString(),
    outputDir,
    recommendedNextCommand: 'npm run seed:competition:package',
    files: {
      manifest: COMPETITION_SEED_ASSETS.files.manifest,
      reference: COMPETITION_SEED_ASSETS.files.reference,
      communities: COMPETITION_SEED_ASSETS.files.communities,
      users: COMPETITION_SEED_ASSETS.files.users,
      emergencyContacts: COMPETITION_SEED_ASSETS.files.emergencyContacts,
      familyBindings: COMPETITION_SEED_ASSETS.files.familyBindings,
      healthArchives: COMPETITION_SEED_ASSETS.files.healthArchives,
      medicationPlans: COMPETITION_SEED_ASSETS.files.medicationPlans,
      medicationLogs: COMPETITION_SEED_ASSETS.files.medicationLogs,
      gpsTracks: COMPETITION_SEED_ASSETS.files.gpsTracks,
      sosEvents: COMPETITION_SEED_ASSETS.files.sosEvents,
      serviceOrders: COMPETITION_SEED_ASSETS.files.serviceOrders,
      volunteerAttendanceLogs: COMPETITION_SEED_ASSETS.files.volunteerAttendanceLogs,
      serviceRecords: COMPETITION_SEED_ASSETS.files.serviceRecords,
      timeBankAccounts: COMPETITION_SEED_ASSETS.files.timeBankAccounts,
      timeBankExchanges: COMPETITION_SEED_ASSETS.files.timeBankExchanges,
      consultations: COMPETITION_SEED_ASSETS.files.consultations,
      appointments: COMPETITION_SEED_ASSETS.files.appointments,
      medicalReports: COMPETITION_SEED_ASSETS.files.medicalReports,
      auditLogs: COMPETITION_SEED_ASSETS.files.auditLogs,
      summary: COMPETITION_SEED_ASSETS.files.summary,
    },
    counts: {
      communities: dataset.communities.length,
      communityAdmins: dataset.communityAdmins.length,
      volunteers: dataset.volunteers.length,
      elders: dataset.elders.length,
      familyMembers: dataset.familyMembers.length,
      emergencyContacts: dataset.emergencyContacts.length,
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
      auditLogs: dataset.auditLogs.length,
    },
  };
}

function generateCompetitionSeedJsonArtifacts(options = {}) {
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : DEFAULT_OUTPUT_DIR;
  const dataset = buildCompetitionSeedDataset();
  ensureDir(outputDir);

  const users = [
    ...dataset.communityAdmins,
    ...dataset.volunteers,
    ...dataset.elders,
    ...dataset.familyMembers,
  ];

  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.manifest, dataset.manifest);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.reference, dataset.reference);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.communities, dataset.communities);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.users, users);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.emergencyContacts, dataset.emergencyContacts);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.familyBindings, dataset.familyBindings);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.healthArchives, dataset.healthArchives);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.medicationPlans, dataset.medicationPlans);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.medicationLogs, dataset.medicationLogs);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.gpsTracks, dataset.gpsTracks);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.sosEvents, dataset.sosEvents);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.serviceOrders, dataset.serviceOrders);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.volunteerAttendanceLogs, dataset.volunteerAttendanceLogs);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.serviceRecords, dataset.serviceRecords);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.timeBankAccounts, dataset.timeBankAccounts);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.timeBankExchanges, dataset.timeBankExchanges);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.consultations, dataset.consultations);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.appointments, dataset.appointments);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.medicalReports, dataset.medicalReports);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.auditLogs, dataset.auditLogs);

  const summary = buildSummary(dataset, outputDir);
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.summary, summary);

  return summary;
}

function main() {
  const result = generateCompetitionSeedJsonArtifacts();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSummary,
  generateCompetitionSeedJsonArtifacts,
};
