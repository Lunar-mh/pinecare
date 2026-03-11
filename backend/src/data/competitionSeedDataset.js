'use strict';

const { COMPETITION_SEED_MANIFEST } = require('./competitionSeedManifest');
const { getHospitals, getDepartments, getDoctors } = require('./publicMedicalDirectory');

const COMMUNITIES = COMPETITION_SEED_MANIFEST.communities;
const HOSPITALS = getHospitals();
const DEPARTMENTS = HOSPITALS.flatMap((hospital) => getDepartments(hospital.id));
const DOCTORS = DEPARTMENTS.flatMap((department) => getDoctors(department.id));

const SURNAMES = ['Lin', 'Chen', 'Wang', 'Li', 'Zhang', 'Xu', 'Liu', 'Sun', 'Zhao', 'Wu'];
const GIVEN_NAMES = ['An', 'Rong', 'Mei', 'Jia', 'Qing', 'Yan', 'Ming', 'Hui', 'Lei', 'Tao'];
const FAMILY_RELATIONS = ['daughter', 'son', 'spouse', 'niece', 'grandson'];
const SERVICE_TYPES = ['escort', 'visit', 'rehabilitation', 'shopping', 'medication-support'];
const REPORT_TYPES = ['Lab', 'Imaging', 'FollowUp'];
const SOS_STATUSES = ['resolved', 'confirmed', 'cancelled'];

function pick(list, index) {
  return list[index % list.length];
}

function pad(num, size = 2) {
  return String(num).padStart(size, '0');
}

function buildPhone(index, prefix = '139') {
  return `${prefix}${String(10000000 + index).slice(-8)}`;
}

function buildName(index, suffix = '') {
  return `${pick(SURNAMES, index)} ${pick(GIVEN_NAMES, index + 3)}${suffix}`.trim();
}

function isoDate(dayOffset, hour = 9, minute = 0) {
  const base = new Date(Date.UTC(2026, 2, 1 + dayOffset, hour, minute, 0));
  return base.toISOString().replace('.000Z', 'Z');
}

function buildCommunities() {
  return COMMUNITIES.map((community, index) => ({
    id: community.id,
    name: community.name,
    city: community.city,
    district: community.district,
    address: `${community.city} ${community.district} Care Block ${index + 1}`,
  }));
}

function buildCommunityAdmins() {
  return COMMUNITIES.map((community, index) => ({
    id: 5000 + index + 1,
    role: 'community_admin',
    communityId: community.id,
    name: buildName(index, ' Admin'),
    phone: buildPhone(index + 1, '188'),
    createdAt: isoDate(index, 8, 20),
  }));
}

function buildVolunteers() {
  const volunteers = [];
  let counter = 0;

  COMMUNITIES.forEach((community) => {
    for (let i = 0; i < community.volunteerCount; i += 1) {
      counter += 1;
      volunteers.push({
        id: 6000 + counter,
        role: 'volunteer',
        communityId: community.id,
        name: buildName(counter, ' Volunteer'),
        phone: buildPhone(counter + 50, '137'),
        skillTags: [pick(SERVICE_TYPES, counter), pick(SERVICE_TYPES, counter + 2)],
        createdAt: isoDate(counter % 10, 9, 0),
      });
    }
  });

  return volunteers;
}

function buildEldersAndFamilies() {
  const elders = [];
  const familyMembers = [];
  const bindings = [];
  let elderCounter = 0;
  let familyCounter = 0;
  let bindingCounter = 0;

  COMMUNITIES.forEach((community) => {
    for (let i = 0; i < community.elderCount; i += 1) {
      elderCounter += 1;
      const elderId = 7000 + elderCounter;
      const familyId = 8000 + elderCounter;
      const age = 66 + (elderCounter % 19);
      const relation = pick(FAMILY_RELATIONS, elderCounter);

      elders.push({
        id: elderId,
        role: 'elder',
        communityId: community.id,
        name: buildName(elderCounter, ' Elder'),
        nickname: `elder_${elderCounter}`,
        phone: buildPhone(elderCounter + 100, '136'),
        age,
        gender: elderCounter % 2 === 0 ? 'female' : 'male',
        chronicDiseases: [pick(['hypertension', 'diabetes', 'coronary_heart_disease'], elderCounter)],
        livingStatus: elderCounter % 3 === 0 ? 'living_alone' : 'with_family',
        createdAt: isoDate(elderCounter % 12, 7, 45),
      });

      familyCounter += 1;
      familyMembers.push({
        id: familyId,
        role: 'family',
        communityId: community.id,
        name: buildName(familyCounter, ' Family'),
        phone: buildPhone(familyCounter + 200, '135'),
        relation,
        elderId,
        createdAt: isoDate(familyCounter % 12, 8, 10),
      });

      bindingCounter += 1;
      bindings.push({
        id: bindingCounter,
        elderId,
        familyId,
        communityId: community.id,
        relation,
        status: 'approved',
        isPrimary: true,
        createdAt: isoDate(bindingCounter % 15, 8, 30),
        approvedAt: isoDate(bindingCounter % 15, 9, 0),
      });
    }
  });

  return { elders, familyMembers, bindings };
}

function buildEmergencyContacts(bindings, familyMembers) {
  const familyMap = familyMembers.reduce((map, member) => {
    map[member.id] = member;
    return map;
  }, {});

  return bindings.map((binding, index) => {
    const member = familyMap[binding.familyId];
    return {
      id: 8500 + index + 1,
      userId: binding.elderId,
      name: member ? member.name : `Family Contact ${index + 1}`,
      phone: member ? member.phone : buildPhone(index + 300, '135'),
      relationship: binding.relation,
      isPrimary: true,
      createdAt: binding.createdAt,
      updatedAt: binding.approvedAt,
    };
  });
}

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

function buildSosEvents(elders) {
  const events = [];
  for (let i = 0; i < 18; i += 1) {
    const elder = elders[i % elders.length];
    const status = pick(SOS_STATUSES, i);
    events.push({
      id: 13000 + i + 1,
      userId: elder.id,
      communityId: elder.communityId,
      triggerType: i % 4 === 0 ? 'auto' : 'manual',
      status,
      createdAt: isoDate(i, 9, 5),
      latestStatusChangedAt: isoDate(i, 9, 20),
      address: `${elder.communityId} Community Building ${pad((i % 9) + 1)}`,
      latitude: Number((31.19 + (i % 4) * 0.002).toFixed(6)),
      longitude: Number((121.45 + (i % 5) * 0.002).toFixed(6)),
    });
  }
  return events;
}

function hashToken(prefix, id) {
  return `${prefix}${String(id).padStart(10, '0')}`.padEnd(64, '0').slice(0, 64);
}

function buildServiceOrders(elders, volunteers) {
  const orders = [];
  const attendanceLogs = [];
  const serviceRecords = [];
  const volunteerByCommunity = volunteers.reduce((map, volunteer) => {
    if (!map[volunteer.communityId]) map[volunteer.communityId] = [];
    map[volunteer.communityId].push(volunteer);
    return map;
  }, {});

  for (let i = 0; i < 42; i += 1) {
    const elder = elders[i % elders.length];
    const communityVolunteers = volunteerByCommunity[elder.communityId] || [];
    const volunteer = communityVolunteers[i % communityVolunteers.length];
    const status = i < 26 ? 'completed' : i < 34 ? 'processing' : 'pending';
    const orderId = 14000 + i + 1;
    const scheduledAt = isoDate(i % 30, 9, 0);
    const completedAt = status === 'completed' ? isoDate(i % 30, 10, 10) : null;
    const createdAt = isoDate(i % 30, 8, 40);

    orders.push({
      id: orderId,
      orderNo: `SO-${orderId}`,
      communityId: elder.communityId,
      elderId: elder.id,
      volunteerId: volunteer ? volunteer.id : null,
      serviceType: pick(SERVICE_TYPES, i),
      status,
      scheduledAt,
      completedAt,
      createdAt,
    });

    if (status !== 'pending' && volunteer) {
      attendanceLogs.push({
        id: 15000 + attendanceLogs.length + 1,
        orderId,
        communityId: elder.communityId,
        volunteerUserId: volunteer.id,
        checkInAt: isoDate(i % 30, 9, 10),
        checkOutAt: status === 'completed' ? isoDate(i % 30, 10, 0) : null,
        createdAt,
        updatedAt: status === 'completed' ? isoDate(i % 30, 10, 5) : isoDate(i % 30, 9, 15),
      });
    }

    if (status === 'completed' && serviceRecords.length < 26 && volunteer) {
      const prevHash =
        serviceRecords.length === 0 ? '0'.repeat(64) : serviceRecords[serviceRecords.length - 1].recordHash;
      serviceRecords.push({
        id: 16000 + serviceRecords.length + 1,
        orderId,
        communityId: elder.communityId,
        providerId: volunteer.id,
        recipientId: elder.id,
        serviceType: pick(SERVICE_TYPES, i),
        startTime: isoDate(i % 30, 9, 10),
        endTime: isoDate(i % 30, 10, 0),
        durationHours: 1,
        timeCoins: 1,
        status: 'confirmed',
        locationHash: hashToken('loc', orderId),
        recordHash: hashToken('record', orderId),
        prevHash,
        providerSignature: `provider-sign-${orderId}`,
        recipientSignature: `recipient-sign-${orderId}`,
        platformSignature: `platform-sign-${orderId}`,
        createdAt: isoDate(i % 30, 10, 5),
      });
    }
  }

  return { orders, attendanceLogs, serviceRecords };
}

function resolveCreditLevel(score) {
  if (score >= 95) return 'angel';
  if (score >= 90) return 'gold';
  if (score >= 85) return 'silver';
  return 'new';
}

function buildTimeBank(volunteers, familyMembers) {
  const userIds = [...volunteers.map((item) => item.id), ...familyMembers.map((item) => item.id)].slice(0, 50);
  const accounts = userIds.map((userId, index) => {
    const creditScore = 80 + (index % 15);
    return {
      id: 17000 + index + 1,
      userId,
      balance: 5 + (index % 8),
      totalEarned: 10 + (index % 12),
      totalSpent: index % 4,
      creditScore,
      creditLevel: resolveCreditLevel(creditScore),
      createdAt: isoDate(index % 20, 11, 0),
      updatedAt: isoDate(index % 20, 11, 15),
    };
  });

  const exchanges = [];
  for (let i = 0; i < 9; i += 1) {
    exchanges.push({
      id: 18000 + i + 1,
      userId: accounts[i].userId,
      exchangeType: i % 2 === 0 ? 'service' : 'goods',
      itemName: i % 2 === 0 ? 'Home Visit Voucher' : 'Health Kit',
      coinsRequired: 2 + (i % 3),
      status: 'completed',
      createdAt: isoDate(i % 15, 14, 10),
      completedAt: isoDate(i % 15, 16, 0),
    });
  }

  return { accounts, exchanges };
}

function buildMedicalData(elders) {
  const consultations = [];
  const appointments = [];
  const reports = [];

  for (let i = 0; i < 12; i += 1) {
    const elder = elders[i % elders.length];
    const doctor = DOCTORS[i % DOCTORS.length];
    const createdAt = isoDate(i % 20, 13, 0);
    const active = i % 3 !== 0;
    consultations.push({
      id: 19000 + i + 1,
      userId: elder.id,
      doctorId: doctor.id,
      department: pick(DEPARTMENTS, i).name,
      consultStatus: active ? 'active' : 'completed',
      sessionUrl: `https://consult.yinban.local/session/${19000 + i + 1}`,
      thirdPartySessionId: `consult_${19000 + i + 1}`,
      startedAt: createdAt,
      endedAt: active ? null : isoDate(i % 20, 13, 40),
      source: 'public_directory_cache',
      mode: 'cached_public',
      createdAt,
    });
  }

  for (let i = 0; i < 16; i += 1) {
    const elder = elders[i % elders.length];
    const doctor = DOCTORS[i % DOCTORS.length];
    appointments.push({
      id: 20000 + i + 1,
      userId: elder.id,
      hospitalId: doctor.hospitalId,
      doctorId: doctor.id,
      department: pick(DEPARTMENTS, i).name,
      appointmentDate: `2026-03-${pad((i % 28) + 1)}`,
      timeSlot: `${pad(8 + (i % 6))}:00-${pad(8 + (i % 6))}:30`,
      appointStatus: i % 5 === 0 ? 'cancelled' : 'confirmed',
      idempotencyKey: `appoint_${20000 + i + 1}`,
      source: 'public_directory_cache',
      mode: 'cached_public',
      createdAt: isoDate(i % 20, 12, 20),
    });
  }

  for (let i = 0; i < 48; i += 1) {
    const elder = elders[i % elders.length];
    const reportDate = `2026-03-${pad((i % 28) + 1)}`;
    reports.push({
      id: 21000 + i + 1,
      userId: elder.id,
      reportNo: `RPT-${elder.id}-${pad(i + 1, 4)}`,
      reportType: pick(REPORT_TYPES, i),
      reportDate,
      reportUrl: `https://reports.yinban.local/${elder.id}/${21000 + i + 1}.pdf`,
      reportData: {
        summary: `Structured ${pick(REPORT_TYPES, i)} report for elder ${elder.id}.`,
        source: 'desensitized_sample',
        indicatorCount: 3 + (i % 4),
      },
      syncStatus: 'synced',
      source: 'desensitized_sample',
      mode: 'cached_sample',
      createdAt: `${reportDate}T10:00:00Z`,
    });
  }

  return { consultations, appointments, reports };
}

function buildAuditLogs(sosEvents, serviceRecords, communityAdmins) {
  const adminByCommunity = communityAdmins.reduce((map, admin) => {
    map[admin.communityId] = admin;
    return map;
  }, {});

  const sosLogs = sosEvents.map((event, index) => {
    const admin = adminByCommunity[event.communityId];
    const actionMap = {
      confirmed: 'community.sos.confirm',
      resolved: 'community.sos.resolve',
      cancelled: 'community.sos.cancel',
    };

    return {
      id: 22000 + index + 1,
      userId: admin ? admin.id : null,
      action: actionMap[event.status] || 'community.sos.resolve',
      details: {
        eventId: event.id,
        communityId: event.communityId,
        eventStatus: event.status,
        source: 'competition_seed',
      },
      createdAt: event.latestStatusChangedAt,
    };
  });

  const serviceLogs = serviceRecords.map((record, index) => ({
    id: 22100 + index + 1,
    userId: record.providerId,
    action: 'volunteer.task.complete',
    details: {
      orderId: record.orderId,
      serviceRecordId: record.id,
      communityId: record.communityId,
      timeCoins: record.timeCoins,
      source: 'competition_seed',
    },
    createdAt: record.createdAt,
  }));

  return [
    ...sosLogs,
    ...serviceLogs,
    {
      id: 22999,
      userId: communityAdmins[0] ? communityAdmins[0].id : null,
      action: 'admin.demo.bootstrap',
      details: {
        scenarioId: 'competition-full-replay',
        source: 'competition_seed',
      },
      createdAt: isoDate(29, 18, 0),
    },
  ];
}

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
