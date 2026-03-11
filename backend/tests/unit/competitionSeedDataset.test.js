'use strict';

const { buildCompetitionSeedDataset } = require('../../src/data/competitionSeedDataset');

describe('competitionSeedDataset', () => {
  it('builds a competition dataset that matches the manifest coverage', () => {
    const dataset = buildCompetitionSeedDataset();

    expect(dataset.communities).toHaveLength(3);
    expect(dataset.communityAdmins).toHaveLength(3);
    expect(dataset.volunteers).toHaveLength(14);
    expect(dataset.elders).toHaveLength(36);
    expect(dataset.familyMembers).toHaveLength(36);
    expect(dataset.emergencyContacts).toHaveLength(36);
    expect(dataset.familyBindings).toHaveLength(36);
    expect(dataset.healthArchives).toHaveLength(36);
    expect(dataset.medicationPlans).toHaveLength(58);
    expect(dataset.medicationLogs).toHaveLength(1740);
    expect(dataset.gpsTracks).toHaveLength(3240);
    expect(dataset.sosEvents).toHaveLength(18);
    expect(dataset.serviceOrders).toHaveLength(42);
    expect(dataset.volunteerAttendanceLogs.length).toBeGreaterThanOrEqual(26);
    expect(dataset.serviceRecords).toHaveLength(26);
    expect(dataset.timeBankAccounts).toHaveLength(50);
    expect(dataset.timeBankExchanges).toHaveLength(9);
    expect(dataset.consultations).toHaveLength(12);
    expect(dataset.appointments).toHaveLength(16);
    expect(dataset.medicalReports).toHaveLength(48);
    expect(dataset.auditLogs).toHaveLength(45);
  });

  it('keeps D chain records relationally consistent', () => {
    const dataset = buildCompetitionSeedDataset();
    const orderIds = new Set(dataset.serviceOrders.map((item) => item.id));
    const elderIds = new Set(dataset.elders.map((item) => item.id));
    const volunteerIds = new Set(dataset.volunteers.map((item) => item.id));

    dataset.serviceRecords.forEach((record) => {
      expect(orderIds.has(record.orderId)).toBe(true);
      expect(elderIds.has(record.recipientId)).toBe(true);
      expect(volunteerIds.has(record.providerId)).toBe(true);
      expect(record.status).toBe('confirmed');
      expect(record.recordHash).toHaveLength(64);
    });
  });

  it('aligns medication plans and SOS data with database-friendly enums', () => {
    const dataset = buildCompetitionSeedDataset();

    dataset.medicationPlans.forEach((plan) => {
      expect(plan.frequency).toBe('once_daily');
      expect(plan.reminderTimes).toHaveLength(1);
    });

    dataset.sosEvents.forEach((event) => {
      expect(['manual', 'auto']).toContain(event.triggerType);
    });
  });
});
