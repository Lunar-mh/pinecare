'use strict';

const mockHarness = require('./mockHarness');

// 1. Mock Redis (In-Memory Key-Value & Sorted Sets)
jest.mock('../../../src/config/redis', () => {
  return {
    get: jest.fn(async (key) => mockHarness.store.redisKeyVal.get(key) || null),
    set: jest.fn(async (key, val) => {
      mockHarness.store.redisKeyVal.set(key, String(val));
      return 'OK';
    }),
    del: jest.fn(async (key) => {
      mockHarness.store.redisKeyVal.delete(key);
      return 1;
    }),
    zremrangebyscore: jest.fn(async (key, min, max) => {
      const zset = mockHarness.store.redisZSets.get(key) || [];
      const filtered = zset.filter((item) => item.score < min || item.score > max);
      mockHarness.store.redisZSets.set(key, filtered);
      return zset.length - filtered.length;
    }),
    zcard: jest.fn(async (key) => {
      const zset = mockHarness.store.redisZSets.get(key) || [];
      return zset.length;
    }),
    zadd: jest.fn(async (key, score, member) => {
      const zset = mockHarness.store.redisZSets.get(key) || [];
      zset.push({ score, member });
      mockHarness.store.redisZSets.set(key, zset);
      return 1;
    }),
    expire: jest.fn(async () => 1),
    on: jest.fn(),
    status: 'ready',
    closeRedis: jest.fn(async () => {}),
    quit: jest.fn(async () => 'OK'),
    disconnect: jest.fn(),
  };
});

// 2. Mock Database Connection Pool
jest.mock('../../../src/config/database', () => {
  return {
    pool: {
      getConnection: jest.fn(async () => ({
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
        query: jest.fn(async () => [[]]),
      })),
      query: jest.fn(async () => [[]]),
      end: jest.fn(async () => {}),
    },
    query: jest.fn(async () => [[]]),
    closePool: jest.fn(async () => {}),
  };
});

// 3. Mock User Model
jest.mock('../../../src/models/user', () => {
  return {
    findById: jest.fn(async (userId) => {
      return mockHarness.store.users.get(Number(userId)) || null;
    }),
  };
});

// 4. Mock Admin & Volunteer Scope Model
jest.mock('../../../src/models/adminScopeModel', () => {
  return {
    findVolunteerScopeByUserId: jest.fn(async (userId) => {
      const scope = mockHarness.store.adminScopes.get(Number(userId));
      if (scope && scope.role === 'volunteer') return scope;
      return null;
    }),
    findCommunityAdminScopeByUserId: jest.fn(async (userId) => {
      const scope = mockHarness.store.adminScopes.get(Number(userId));
      if (scope && scope.role === 'admin') return scope;
      return null;
    }),
  };
});

// 5. Mock Health Record Model
jest.mock('../../../src/models/healthRecordModel', () => {
  return {
    insertManual: jest.fn(async (data) => {
      const id = ++mockHarness.store.nextId.health;
      const record = {
        id,
        userId: data.userId,
        metricType: data.metricType,
        value: data.value,
        valueHigh: data.valueHigh,
        valueLow: data.valueLow,
        deviceId: data.deviceId || null,
        source: 'manual',
        measuredAt: data.measuredAt || new Date().toISOString(),
        syncedAt: data.syncedAt || new Date().toISOString(),
      };
      mockHarness.store.healthRecords.unshift(record);
      return record;
    }),
    insertSyncBatch: jest.fn(async (userId, records) => {
      return (records || []).map((r) => {
        const id = ++mockHarness.store.nextId.health;
        const row = {
          id,
          userId,
          metricType: r.metric_type || r.metricType,
          value: r.value,
          valueHigh: r.value_high !== undefined ? r.value_high : r.valueHigh,
          valueLow: r.value_low !== undefined ? r.value_low : r.valueLow,
          deviceId: r.device_id || r.deviceId || null,
          source: 'sync',
          measuredAt: r.measured_at || r.measuredAt || new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        };
        mockHarness.store.healthRecords.unshift(row);
        return row;
      });
    }),
    getTodayRecords: jest.fn(async (userId) => {
      return mockHarness.store.healthRecords.filter((r) => r.userId === Number(userId));
    }),
    getTrendData: jest.fn(async (userId, metricType, period) => {
      const limit = period === '30d' ? 30 : 7;
      const list = mockHarness.store.healthRecords
        .filter((r) => r.userId === Number(userId) && r.metricType === metricType)
        .slice(0, limit);
      return list;
    }),
    getLatestByMetricType: jest.fn(async (userId, metricType) => {
      const record = mockHarness.store.healthRecords.find(
        (r) => r.userId === Number(userId) && r.metricType === metricType
      );
      return record || null;
    }),
  };
});

// 6. Mock Device Binding Model
jest.mock('../../../src/models/deviceBindingModel', () => {
  return {
    listDevices: jest.fn(async (userId) => {
      return Array.from(mockHarness.store.devices.values()).filter(
        (d) => d.user_id === Number(userId) && d.status !== 'unbound'
      );
    }),
    bindDevice: jest.fn(async (data) => {
      const id = ++mockHarness.store.nextId.device;
      if (data.isPrimary) {
        for (const d of mockHarness.store.devices.values()) {
          if (d.user_id === Number(data.userId)) d.is_primary = 0;
        }
      }
      const dev = {
        id,
        user_id: Number(data.userId),
        device_name: data.deviceName,
        device_mac: data.deviceMac,
        device_type: data.deviceType,
        is_primary: data.isPrimary ? 1 : 0,
        battery_level: data.batteryLevel !== null ? data.batteryLevel : 100,
        last_sync_at: data.lastSyncAt || new Date().toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
      };
      mockHarness.store.devices.set(id, dev);
      return dev;
    }),
    unbindDevice: jest.fn(async (userId, deviceId) => {
      const dev = mockHarness.store.devices.get(Number(deviceId));
      if (!dev || dev.user_id !== Number(userId) || dev.status === 'unbound') return false;
      dev.status = 'unbound';
      return true;
    }),
    setPrimary: jest.fn(async (userId, deviceId) => {
      const target = mockHarness.store.devices.get(Number(deviceId));
      if (!target || target.user_id !== Number(userId) || target.status === 'unbound') return false;
      for (const d of mockHarness.store.devices.values()) {
        if (d.user_id === Number(userId)) d.is_primary = 0;
      }
      target.is_primary = 1;
      return true;
    }),
  };
});

// 7. Mock SOS Event Model
jest.mock('../../../src/models/sosEvent', () => {
  return {
    createEvent: jest.fn(async (data) => {
      const id = ++mockHarness.store.nextId.sos;
      const event = {
        id,
        user_id: Number(data.userId),
        trigger_type: data.triggerType || 'manual',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        address: data.address || null,
        event_status: 'triggered',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockHarness.store.sosEvents.set(id, event);
      return event;
    }),
    findByIdAndUser: jest.fn(async (id, userId) => {
      const ev = mockHarness.store.sosEvents.get(Number(id));
      if (ev && ev.user_id === Number(userId)) return ev;
      return null;
    }),
    findById: jest.fn(async (id) => {
      return mockHarness.store.sosEvents.get(Number(id)) || null;
    }),
    transitionStatus: jest.fn(async (id, userId, fromStatus, toStatus) => {
      const ev = mockHarness.store.sosEvents.get(Number(id));
      if (!ev || ev.user_id !== Number(userId) || ev.event_status !== fromStatus) return false;
      ev.event_status = toStatus;
      ev[`${toStatus}_at`] = new Date().toISOString();
      ev.updated_at = new Date().toISOString();
      return true;
    }),
    countByUser: jest.fn(async (userId, status) => {
      let list = Array.from(mockHarness.store.sosEvents.values()).filter(
        (e) => e.user_id === Number(userId)
      );
      if (status) list = list.filter((e) => e.event_status === status);
      return list.length;
    }),
    listByUser: jest.fn(async (userId, options = {}) => {
      let list = Array.from(mockHarness.store.sosEvents.values()).filter(
        (e) => e.user_id === Number(userId)
      );
      if (options.status) list = list.filter((e) => e.event_status === options.status);
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const page = Math.max(1, Number(options.page) || 1);
      const pageSize = Math.max(1, Number(options.pageSize) || 10);
      const offset = (page - 1) * pageSize;
      return list.slice(offset, offset + pageSize);
    }),
    listActiveByUser: jest.fn(async (userId, limit = 3) => {
      return Array.from(mockHarness.store.sosEvents.values())
        .filter((e) => e.user_id === Number(userId) && ['triggered', 'confirmed'].includes(e.event_status))
        .slice(0, limit);
    }),
    autoResolveTimeoutEvents: jest.fn(async () => 0),
  };
});

// 7b. Mock SosNotificationModel
jest.mock('../../../src/models/sosNotification', () => ({
  summarizeByEventIds: jest.fn(async () => []),
  createNotificationLog: jest.fn(async () => 1),
}));

// 8. Mock Fall Detection Model
jest.mock('../../../src/models/fall', () => {
  return {
    createDetectingEvent: jest.fn(async (userId, sensorData, sensitivity) => {
      const id = ++mockHarness.store.nextId.fall;
      const ev = {
        id,
        userId: Number(userId),
        sensorData,
        sensitivity,
        status: 'detecting',
        detectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      mockHarness.store.fallEvents.set(id, ev);
      return id;
    }),
    createFalseAlarmEvent: jest.fn(async (userId, sensorData, sensitivity) => {
      const id = ++mockHarness.store.nextId.fall;
      const ev = {
        id,
        userId: Number(userId),
        sensorData,
        sensitivity,
        status: 'false_alarm',
        detectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      mockHarness.store.fallEvents.set(id, ev);
      return id;
    }),
    findEventById: jest.fn(async (id) => {
      return mockHarness.store.fallEvents.get(Number(id)) || null;
    }),
    findEventByIdAndUser: jest.fn(async (id, userId) => {
      const ev = mockHarness.store.fallEvents.get(Number(id));
      if (ev && ev.userId === Number(userId)) return ev;
      return null;
    }),
    markCancelled: jest.fn(async (id) => {
      const ev = mockHarness.store.fallEvents.get(Number(id));
      if (!ev || ev.status !== 'detecting') return false;
      ev.status = 'cancelled';
      ev.cancelledAt = new Date().toISOString();
      return true;
    }),
    markConfirmed: jest.fn(async (id) => {
      const ev = mockHarness.store.fallEvents.get(Number(id));
      if (!ev || ev.status !== 'detecting') return false;
      ev.status = 'confirmed';
      ev.confirmedAt = new Date().toISOString();
      return true;
    }),
    getNotificationContacts: jest.fn(async () => [
      { id: 1, name: '李小梅 (家属)', phone: '13800001002', notifyType: 'wechat' },
      { id: 2, name: '社区紧急网格员', phone: '13800003001', notifyType: 'sms' },
    ]),
    createNotificationRecords: jest.fn(async (eventId, contacts) => {
      (contacts || []).forEach((c) => {
        mockHarness.store.fallNotifications.push({
          id: mockHarness.store.fallNotifications.length + 1,
          eventId,
          contactName: c.name,
          phone: c.phone,
          status: 'sent',
          createdAt: new Date().toISOString(),
        });
      });
      return true;
    }),
    findNotificationsByEventId: jest.fn(async (eventId) => {
      return mockHarness.store.fallNotifications.filter((n) => n.eventId === Number(eventId));
    }),
    updateNotificationStatus: jest.fn(async () => true),
    countHistory: jest.fn(async (userId, filters) => {
      let list = Array.from(mockHarness.store.fallEvents.values()).filter((e) => e.userId === Number(userId));
      if (filters && filters.status) list = list.filter((e) => e.status === filters.status);
      return list.length;
    }),
    listHistory: jest.fn(async (userId, options) => {
      let list = Array.from(mockHarness.store.fallEvents.values()).filter((e) => e.userId === Number(userId));
      if (options && options.status) list = list.filter((e) => e.status === options.status);
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }),
    getSensitivitySetting: jest.fn(async (userId) => {
      return mockHarness.store.fallSettings.get(Number(userId)) || { sensitivity: 'medium', updatedAt: null };
    }),
    upsertSensitivitySetting: jest.fn(async (userId, sensitivity) => {
      mockHarness.store.fallSettings.set(Number(userId), { sensitivity, updatedAt: new Date().toISOString() });
      return true;
    }),
    findExpiredDetectingEvents: jest.fn(async (seconds) => {
      const cutoff = Date.now() - seconds * 1000;
      return Array.from(mockHarness.store.fallEvents.values()).filter(
        (e) => e.status === 'detecting' && new Date(e.createdAt).getTime() <= cutoff
      );
    }),
  };
});

// 9. Mock Medication Plan Model
jest.mock('../../../src/models/medicationPlanModel', () => {
  return {
    create: jest.fn(async (data) => {
      const id = ++mockHarness.store.nextId.medPlan;
      const created = {
        id,
        user_id: Number(data.user_id),
        medication_name: data.medication_name,
        dosage: data.dosage,
        frequency: data.frequency,
        remind_times: data.remind_times || ['08:00'],
        remaining_quantity:
          data.remaining_quantity !== undefined && data.remaining_quantity !== null
            ? Number(data.remaining_quantity)
            : 30,
        reminder_threshold: data.reminder_threshold || 3,
        start_date: data.start_date || new Date().toISOString().slice(0, 10),
        end_date: data.end_date || null,
        is_active: data.is_active !== undefined ? Number(data.is_active) : 1,
        created_at: new Date().toISOString(),
      };
      mockHarness.store.medicationPlans.set(id, created);
      return created;
    }),
    listByUserId: jest.fn(async (userId) => {
      return Array.from(mockHarness.store.medicationPlans.values()).filter(
        (p) => p.user_id === Number(userId) && Number(p.is_active) === 1
      );
    }),
    getByIdAndUser: jest.fn(async (id, userId) => {
      const p = mockHarness.store.medicationPlans.get(Number(id));
      if (p && p.user_id === Number(userId)) return p;
      return null;
    }),
    updateByIdAndUser: jest.fn(async (id, userId, data) => {
      const p = mockHarness.store.medicationPlans.get(Number(id));
      if (!p || p.user_id !== Number(userId)) return null;
      Object.assign(p, data);
      return p;
    }),
    deleteByIdAndUser: jest.fn(async (id, userId) => {
      const p = mockHarness.store.medicationPlans.get(Number(id));
      if (!p || p.user_id !== Number(userId)) return false;
      p.is_active = 0;
      return true;
    }),
    decreaseRemainingQuantity: jest.fn(async (planId, userId) => {
      const p = mockHarness.store.medicationPlans.get(Number(planId));
      if (p && p.user_id === Number(userId) && p.remaining_quantity > 0) {
        p.remaining_quantity -= 1;
      }
    }),
  };
});

// 10. Mock Medication Log Model
jest.mock('../../../src/models/medicationLogModel', () => {
  return {
    listByUserAndDateRange: jest.fn(async (userId, startDate, endDate) => {
      let list = Array.from(mockHarness.store.medicationLogs.values()).filter(
        (l) => l.user_id === Number(userId)
      );
      if (startDate) list = list.filter((l) => l.scheduled_date >= startDate);
      if (endDate) list = list.filter((l) => l.scheduled_date <= endDate);
      return list;
    }),
    createPendingLog: jest.fn(async (data) => {
      const existing = Array.from(mockHarness.store.medicationLogs.values()).find(
        (l) =>
          l.user_id === Number(data.user_id) &&
          l.plan_id === Number(data.plan_id) &&
          l.scheduled_time === data.scheduled_time
      );
      if (existing) return existing;

      const id = ++mockHarness.store.nextId.medLog;
      const plan = mockHarness.store.medicationPlans.get(Number(data.plan_id)) || {};
      const log = {
        id,
        user_id: Number(data.user_id),
        plan_id: Number(data.plan_id),
        medication_name: plan.medication_name || '测试药品',
        dosage: plan.dosage || '1片',
        scheduled_time: data.scheduled_time,
        scheduled_date: String(data.scheduled_time).slice(0, 10),
        status: 'pending',
        actual_time: null,
      };
      mockHarness.store.medicationLogs.set(id, log);
      return log;
    }),
    listByUserAndDay: jest.fn(async (userId, dayStart, _dayEndExclusive) => {
      const day = String(dayStart).slice(0, 10);
      return Array.from(mockHarness.store.medicationLogs.values()).filter(
        (l) => l.user_id === Number(userId) && l.scheduled_date === day
      );
    }),
    getByIdAndUser: jest.fn(async (id, userId) => {
      const l = mockHarness.store.medicationLogs.get(Number(id));
      if (l && l.user_id === Number(userId)) return l;
      return null;
    }),
    updateStatusPendingOnly: jest.fn(async (id, userId, status) => {
      const l = mockHarness.store.medicationLogs.get(Number(id));
      if (!l || l.user_id !== Number(userId) || l.status !== 'pending') {
        return 0;
      }
      l.status = status;
      l.actual_time = status === 'taken' ? new Date().toISOString() : null;
      return 1;
    }),
    aggregateCalendarByMonth: jest.fn(async (userId, start, endExclusive) => {
      const rows = [];
      const cursor = new Date(start.getTime());
      while (cursor < endExclusive) {
        const dayStr = cursor.toISOString().slice(0, 10);
        rows.push({
          day: dayStr,
          taken_count: 1,
          missed_count: 0,
          skipped_count: 0,
          pending_count: 0,
          total_count: 1,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return rows;
    }),
  };
});

// 11. Mock Family Model
jest.mock('../../../src/models/family', () => {
  return {
    listBindingsByFamilyId: jest.fn(async (familyId) => {
      return mockHarness.store.familyBindings.filter((b) => b.familyId === Number(familyId));
    }),
    checkFamilyBinding: jest.fn(async (familyId, elderId) => {
      return mockHarness.store.familyBindings.some(
        (b) => b.familyId === Number(familyId) && b.elderId === Number(elderId)
      );
    }),
    getLatestHealthSnapshot: jest.fn(async (elderId) => {
      const records = mockHarness.store.healthRecords.filter((r) => r.userId === Number(elderId));
      return {
        archive: { updatedAt: records[0] ? records[0].measuredAt : new Date().toISOString() },
        latestRecords: records.slice(0, 5),
      };
    }),
    getLatestLocation: jest.fn(async () => ({
      latitude: 30.2741,
      longitude: 120.1551,
      address: '浙江省杭州市西湖区翠竹新村3栋201',
      updatedAt: new Date().toISOString(),
    })),
    findNotificationSettingsByUserId: jest.fn(async (userId) => {
      return mockHarness.store.familySettings.get(Number(userId)) || null;
    }),
    upsertNotificationSettings: jest.fn(async (userId, settings) => {
      const current = mockHarness.store.familySettings.get(Number(userId)) || {};
      const updated = { ...current, ...settings, userId: Number(userId) };
      mockHarness.store.familySettings.set(Number(userId), updated);
      return updated;
    }),
  };
});

// 11b. Mock Family Relation Model
jest.mock('../../../src/models/familyRelationModel', () => ({
  checkRelation: jest.fn(async (caregiverId, elderId) => {
    return mockHarness.store.familyBindings.some(
      (b) => b.familyId === Number(caregiverId) && b.elderId === Number(elderId)
    );
  }),
}));

// 12. Mock Volunteer Model
jest.mock('../../../src/models/volunteerModel', () => {
  return {
    findProfileByUserId: jest.fn(async (userId, communityId) => {
      const p = mockHarness.store.volunteerProfiles.get(Number(userId));
      if (!p || Number(p.communityId) !== Number(communityId)) return null;
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        community_id: p.communityId,
        role: p.role,
        created_at: new Date(Date.now() - 864000000).toISOString(),
      };
    }),
    findTaskByIdForVolunteer: jest.fn(async (scope, taskId) => {
      const t = mockHarness.store.volunteerTasks.get(Number(taskId));
      if (!t || Number(t.community_id) !== Number(scope.communityId)) return null;
      return t;
    }),
    listTasksByVolunteer: jest.fn(async (scope, filters, _pagination) => {
      let list = Array.from(mockHarness.store.volunteerTasks.values()).filter(
        (t) => Number(t.community_id) === Number(scope.communityId)
      );
      if (filters && filters.status) {
        list = list.filter((t) => t.status === filters.status);
      }
      return list;
    }),
    countTasksByVolunteer: jest.fn(async (scope, filters) => {
      let list = Array.from(mockHarness.store.volunteerTasks.values()).filter(
        (t) => Number(t.community_id) === Number(scope.communityId)
      );
      if (filters && filters.status) {
        list = list.filter((t) => t.status === filters.status);
      }
      return list.length;
    }),
    countTaskSummary: jest.fn(async (scope) => {
      const list = Array.from(mockHarness.store.volunteerTasks.values()).filter(
        (t) => Number(t.community_id) === Number(scope.communityId)
      );
      return {
        total: list.length,
        pending: list.filter((t) => t.status === 'pending').length,
        assigned: list.filter((t) => t.status === 'assigned').length,
        processing: list.filter((t) => t.status === 'processing').length,
        completed: list.filter((t) => t.status === 'completed').length,
      };
    }),
    getServiceHoursSummary: jest.fn(async () => ({
      completed_count: 3,
      total_service_hours: 6.5,
    })),
    acceptTask: jest.fn(async (taskId, scope) => {
      const t = mockHarness.store.volunteerTasks.get(Number(taskId));
      if (!t || t.status !== 'pending') return { affectedRows: 0 };
      t.status = 'assigned';
      t.volunteer_id = Number(scope.userId);
      t.assigned_at = new Date().toISOString();
      return { affectedRows: 1 };
    }),
    updateOwnedTaskStatus: jest.fn(async (taskId, volunteerId, status, extra = {}) => {
      const t = mockHarness.store.volunteerTasks.get(Number(taskId));
      if (!t || Number(t.volunteer_id) !== Number(volunteerId)) return { affectedRows: 0 };
      t.status = status;
      if (extra.completedAt) t.completed_at = extra.completedAt;
      return { affectedRows: 1 };
    }),
    upsertAttendance: jest.fn(async (attendance) => {
      const current = mockHarness.store.volunteerAttendances.get(Number(attendance.orderId)) || {};
      mockHarness.store.volunteerAttendances.set(Number(attendance.orderId), { ...current, ...attendance });
      return true;
    }),
    getAttendanceByOrderId: jest.fn(async (scope, taskId) => {
      return mockHarness.store.volunteerAttendances.get(Number(taskId)) || null;
    }),
    listTrainingByVolunteerId: jest.fn(async () => []),
    countTrainingByVolunteerId: jest.fn(async () => 0),
  };
});

// 13. Mock Audit Log Model
jest.mock('../../../src/models/auditLog', () => {
  return {
    create: jest.fn(async (entry) => {
      const id = ++mockHarness.store.nextId.audit;
      const log = { id, ...entry, createdAt: new Date().toISOString() };
      mockHarness.store.auditLogs.unshift(log);
      return log;
    }),
    list: jest.fn(async (filter = {}) => {
      let list = mockHarness.store.auditLogs;
      if (filter.action) list = list.filter((l) => l.action === filter.action);
      if (filter.userId) list = list.filter((l) => l.userId === Number(filter.userId));
      return list;
    }),
    count: jest.fn(async (filter = {}) => {
      let list = mockHarness.store.auditLogs;
      if (filter.action) list = list.filter((l) => l.action === filter.action);
      if (filter.userId) list = list.filter((l) => l.userId === Number(filter.userId));
      return list.length;
    }),
  };
});

// 14. Mock Admin Ops Model
jest.mock('../../../src/models/adminOpsModel', () => {
  return {
    listSosEvents: jest.fn(async (filter) => {
      let list = Array.from(mockHarness.store.sosEvents.values());
      if (filter && filter.status) list = list.filter((e) => e.event_status === filter.status);
      return list.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        nickname: '李建国',
        phone: '13800001001',
        event_status: item.event_status,
        trigger_type: item.trigger_type,
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
        created_at: item.created_at,
        confirmed_at: item.confirmed_at || null,
        resolved_at: item.resolved_at || null,
        cancelled_at: item.cancelled_at || null,
      }));
    }),
    countSosEvents: jest.fn(async (filter) => {
      let list = Array.from(mockHarness.store.sosEvents.values());
      if (filter && filter.status) list = list.filter((e) => e.event_status === filter.status);
      return list.length;
    }),
    summarizeSosNotifications: jest.fn(async () => []),
    listSosNotificationDetails: jest.fn(async () => []),
    getSosEventById: jest.fn(async (id) => {
      return mockHarness.store.sosEvents.get(Number(id)) || null;
    }),
    updateSosEventStatus: jest.fn(async (id, from, to) => {
      const ev = mockHarness.store.sosEvents.get(Number(id));
      if (!ev || ev.event_status !== from) return 0;
      ev.event_status = to;
      ev[`${to}_at`] = new Date().toISOString();
      return 1;
    }),
  };
});

// 16. Mock voiceService (pruned in M1)
jest.mock('../../../src/services/voiceService', () => ({
  recognize: jest.fn(),
  synthesize: jest.fn(),
}), { virtual: true });

// 17. Mock sosNotificationService
jest.mock('../../../src/services/sosNotificationService', () => ({
  createAndDispatch: jest.fn(async () => ({ total: 2, dispatched: 2 })),
}));

// 18. Mock System Health Service
jest.mock('../../../src/services/systemHealthService', () => ({
  getHealthStatus: jest.fn(async () => ({
    healthy: true,
    data: {
      status: 'ok',
      runtimeMode: 'COMPETITION_SANDBOX',
      mysql: { status: 'ok' },
      redis: { status: 'ok' },
    },
  })),
  getReadinessStatus: jest.fn(async () => ({
    ready: true,
    status: 'ready',
  })),
}));

const app = require('../../../src/app');

module.exports = {
  app,
  mockHarness,
};
