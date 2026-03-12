'use strict';

const { isoDate, pick } = require('./shared');

function buildHealthArchives(elders) {
  return elders.map((elder, index) => ({
    id: 9000 + index + 1,
    userId: elder.id,
    communityId: elder.communityId,
    bloodType: pick(['A', 'B', 'AB', 'O'], index),
    chronicDiseases: elder.chronicDiseases,
    allergies: index % 4 === 0 ? ['penicillin'] : [],
    emergencyRiskLevel: index % 5 === 0 ? 'high' : 'medium',
    createdAt: isoDate(index % 30, 8, 0),
    updatedAt: isoDate(index % 30, 8, 30),
  }));
}

function buildMedicationPlans(elders) {
  const plans = [];
  const medicationNames = ['Aspirin', 'Metformin', 'Amlodipine', 'Atorvastatin', 'Bisoprolol'];

  elders.forEach((elder, elderIndex) => {
    const count = elderIndex < 22 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const planId = 10000 + plans.length + 1;
      plans.push({
        id: planId,
        userId: elder.id,
        communityId: elder.communityId,
        medicationName: pick(medicationNames, planId),
        dosage: `${(i % 2) + 1} tablet`,
        frequency: 'once_daily',
        reminderTimes: [i % 2 === 0 ? '08:00' : '09:00'],
        startDate: '2026-03-01',
        endDate: '2026-03-30',
        remainingQuantity: 18 + (planId % 10),
        reminderThreshold: 3,
        createdAt: isoDate((elderIndex + i) % 10, 6, 50),
        updatedAt: isoDate((elderIndex + i) % 10, 6, 55),
      });
    }
  });

  return plans;
}

function buildMedicationLogs(plans) {
  const logs = [];
  const statusCycle = ['taken', 'taken', 'taken', 'pending', 'missed'];

  plans.forEach((plan, planIndex) => {
    for (let day = 0; day < 30; day += 1) {
      const [hour, minute] = plan.reminderTimes[0].split(':').map(Number);
      const scheduledAt = isoDate(day, hour, minute);
      const status = pick(statusCycle, planIndex + day);
      logs.push({
        id: 11000 + logs.length + 1,
        planId: plan.id,
        userId: plan.userId,
        communityId: plan.communityId,
        medicationName: plan.medicationName,
        scheduledAt,
        actualAt: status === 'taken' ? isoDate(day, hour, minute + 10) : null,
        status,
        reminderSent: true,
        secondReminderSent: status === 'missed',
        familyNotified: status === 'missed',
        createdAt: scheduledAt,
        updatedAt: status === 'taken' ? isoDate(day, hour, minute + 10) : scheduledAt,
      });
    }
  });

  return logs;
}

function buildGpsTracks(elders) {
  const points = [];
  elders.forEach((elder, elderIndex) => {
    const baseLat = 31.18 + (elderIndex % 6) * 0.01;
    const baseLng = 121.43 + (elderIndex % 6) * 0.01;
    for (let i = 0; i < 90; i += 1) {
      const recordedAt = isoDate(Math.floor(i / 3), 7 + (i % 6), 10);
      points.push({
        id: 12000 + points.length + 1,
        userId: elder.id,
        communityId: elder.communityId,
        latitude: Number((baseLat + (i % 5) * 0.0008).toFixed(6)),
        longitude: Number((baseLng + (i % 7) * 0.0007).toFixed(6)),
        accuracy: 12 + (i % 6),
        recordedAt,
      });
    }
  });
  return points;
}

module.exports = {
  buildHealthArchives,
  buildMedicationPlans,
  buildMedicationLogs,
  buildGpsTracks,
};
