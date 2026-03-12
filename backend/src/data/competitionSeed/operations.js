'use strict';

const { SERVICE_TYPES, SOS_STATUSES, hashToken, isoDate, pick, resolveCreditLevel } = require('./shared');

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
      address: `${elder.communityId} Community Building ${String((i % 9) + 1).padStart(2, '0')}`,
      latitude: Number((31.19 + (i % 4) * 0.002).toFixed(6)),
      longitude: Number((121.45 + (i % 5) * 0.002).toFixed(6)),
    });
  }
  return events;
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

module.exports = {
  buildSosEvents,
  buildServiceOrders,
  buildTimeBank,
  buildAuditLogs,
};
