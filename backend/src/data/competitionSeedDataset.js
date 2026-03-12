'use strict';

const {
  COMPETITION_SEED_MANIFEST,
  HOSPITALS,
  DEPARTMENTS,
  DOCTORS,
} = require('./competitionSeed/shared');
const {
  buildCommunities,
  buildCommunityAdmins,
  buildVolunteers,
  buildEldersAndFamilies,
  buildEmergencyContacts,
} = require('./competitionSeed/people');
const {
  buildHealthArchives,
  buildMedicationPlans,
  buildMedicationLogs,
  buildGpsTracks,
} = require('./competitionSeed/care');
const {
  buildSosEvents,
  buildServiceOrders,
  buildTimeBank,
  buildAuditLogs,
} = require('./competitionSeed/operations');
const { buildMedicalData } = require('./competitionSeed/medical');

function buildCompetitionSeedDataset() {
  const communities = buildCommunities();
  const communityAdmins = buildCommunityAdmins();
  const volunteers = buildVolunteers();
  const { elders, familyMembers, bindings } = buildEldersAndFamilies();
  const emergencyContacts = buildEmergencyContacts(bindings, familyMembers);
  const healthArchives = buildHealthArchives(elders);
  const medicationPlans = buildMedicationPlans(elders);
  const medicationLogs = buildMedicationLogs(medicationPlans);
  const gpsTracks = buildGpsTracks(elders);
  const sosEvents = buildSosEvents(elders);
  const { orders, attendanceLogs, serviceRecords } = buildServiceOrders(elders, volunteers);
  const timeBank = buildTimeBank(volunteers, familyMembers);
  const medical = buildMedicalData(elders);
  const auditLogs = buildAuditLogs(sosEvents, serviceRecords, communityAdmins);

  return {
    manifest: COMPETITION_SEED_MANIFEST,
    reference: {
      hospitals: HOSPITALS,
      departments: DEPARTMENTS,
      doctors: DOCTORS,
    },
    communities,
    communityAdmins,
    volunteers,
    elders,
    familyMembers,
    emergencyContacts,
    familyBindings: bindings,
    healthArchives,
    medicationPlans,
    medicationLogs,
    gpsTracks,
    sosEvents,
    serviceOrders: orders,
    volunteerAttendanceLogs: attendanceLogs,
    serviceRecords,
    timeBankAccounts: timeBank.accounts,
    timeBankExchanges: timeBank.exchanges,
    consultations: medical.consultations,
    appointments: medical.appointments,
    medicalReports: medical.reports,
    auditLogs,
  };
}

module.exports = {
  buildCompetitionSeedDataset,
};
