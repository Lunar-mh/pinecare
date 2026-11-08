'use strict';

const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-silver-companion-secret';
process.env.RUNTIME_MODE = 'COMPETITION_SANDBOX';
process.env.NODE_ENV = 'test';

class MockHarness {
  constructor() {
    this.store = {
      users: new Map(),
      adminScopes: new Map(),
      healthRecords: [],
      devices: new Map(),
      sosEvents: new Map(),
      sosNotifications: [],
      fallEvents: new Map(),
      fallSettings: new Map(),
      fallNotifications: [],
      medicationPlans: new Map(),
      medicationLogs: new Map(),
      familyBindings: [],
      familySettings: new Map(),
      volunteerProfiles: new Map(),
      volunteerTasks: new Map(),
      volunteerAttendances: new Map(),
      auditLogs: [],
      redisKeyVal: new Map(),
      redisZSets: new Map(),
      nextId: {
        health: 10,
        device: 10,
        sos: 100,
        fall: 200,
        medPlan: 300,
        medLog: 400,
        task: 500,
        audit: 600,
      },
    };

    this.resetStore();
  }

  resetStore() {
    this.store.users.clear();
    this.store.adminScopes.clear();
    this.store.healthRecords = [];
    this.store.devices.clear();
    this.store.sosEvents.clear();
    this.store.sosNotifications = [];
    this.store.fallEvents.clear();
    this.store.fallSettings.clear();
    this.store.fallNotifications = [];
    this.store.medicationPlans.clear();
    this.store.medicationLogs.clear();
    this.store.familyBindings = [];
    this.store.familySettings.clear();
    this.store.volunteerProfiles.clear();
    this.store.volunteerTasks.clear();
    this.store.volunteerAttendances.clear();
    this.store.auditLogs = [];
    this.store.redisKeyVal.clear();
    this.store.redisZSets.clear();

    // 1. 基础用户 (Elder, Family, Volunteer, Admin)
    this.store.users.set(1001, {
      id: 1001,
      nickname: '李建国',
      phone: '13800001001',
      role: 'elder',
      account_status: 'active',
    });
    this.store.users.set(1002, {
      id: 1002,
      nickname: '李小梅',
      phone: '13800001002',
      role: 'family',
      account_status: 'active',
    });
    this.store.users.set(2001, {
      id: 2001,
      nickname: '张青年',
      phone: '13800002001',
      role: 'volunteer',
      account_status: 'active',
    });
    this.store.users.set(3001, {
      id: 3001,
      nickname: '王社区主管',
      phone: '13800003001',
      role: 'admin',
      account_status: 'active',
    });

    // 2. 权限与辖区 (Admin & Volunteer Scopes)
    this.store.adminScopes.set(2001, {
      userId: 2001,
      communityId: 1,
      role: 'volunteer',
      status: 'active',
    });
    this.store.adminScopes.set(3001, {
      adminId: 1,
      userId: 3001,
      communityId: 1,
      role: 'admin',
      isGlobalAdmin: false,
    });

    // 3. 家属绑定与设置 (Family Bindings)
    this.store.familyBindings.push({
      familyId: 1002,
      elderId: 1001,
      relationship: '女儿',
      elderProfile: {
        realName: '李建国',
        nickname: '老李头',
        phone: '13800001001',
        avatarUrl: 'https://cdn.example.com/avatars/elder1001.png',
      },
    });
    this.store.familySettings.set(1002, {
      userId: 1002,
      healthAlertEnabled: true,
      medicationReminderEnabled: true,
      sosAlertEnabled: true,
    });

    // 4. 志愿者档案与默认工单
    this.store.volunteerProfiles.set(2001, {
      id: 2001,
      name: '张青年',
      phone: '13800002001',
      role: 'volunteer',
      communityId: 1,
      stars: 5,
      totalHours: 18.5,
      timeCoins: 36,
    });

    this.store.volunteerTasks.set(501, {
      id: 501,
      taskId: 501,
      title: '独居长辈日常陪伴与测血压',
      elder_id: 1001,
      elder_name: '李建国',
      elder_phone: '13800001001',
      service_type: 'companion',
      status: 'pending',
      community_id: 1,
      address: '翠竹新村3栋201',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      volunteer_id: null,
      assigned_at: null,
      check_in_at: null,
      completed_at: null,
    });

    // 5. 初始设备 (Devices)
    this.store.devices.set(1, {
      id: 1,
      user_id: 1001,
      device_name: '银伴智能跌倒监测手环 H1',
      device_mac: 'C8:2E:47:89:AB:01',
      device_type: 'smart_band',
      is_primary: 1,
      battery_level: 92,
      last_sync_at: new Date(Date.now() - 1800000).toISOString(),
      status: 'active',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    });

    // 6. 初始健康体征记录 (Health Records)
    this.store.healthRecords.push({
      id: 1,
      userId: 1001,
      metricType: 'blood_pressure',
      value: '128/82',
      valueHigh: 128,
      valueLow: 82,
      deviceId: 1,
      source: 'device',
      measuredAt: new Date(Date.now() - 7200000).toISOString(),
      syncedAt: new Date(Date.now() - 7100000).toISOString(),
    });
    this.store.healthRecords.push({
      id: 2,
      userId: 1001,
      metricType: 'heart_rate',
      value: '72',
      valueHigh: null,
      valueLow: null,
      deviceId: 1,
      source: 'device',
      measuredAt: new Date(Date.now() - 7200000).toISOString(),
      syncedAt: new Date(Date.now() - 7100000).toISOString(),
    });

    // 7. 初始用药计划与今日记录 (Medication)
    const todayStr = new Date().toISOString().slice(0, 10);
    this.store.medicationPlans.set(1, {
      id: 1,
      user_id: 1001,
      medication_name: '苯磺酸氨氯地平片',
      dosage: '5mg',
      unit: '片',
      frequency: 'once_daily',
      remind_times: ['08:00'],
      remaining_quantity: 28,
      total_quantity: 30,
      reminder_threshold: 3,
      start_date: todayStr,
      end_date: '2026-12-31',
      is_active: 1,
      status: 'active',
      notes: '每日早饭后温水送服',
    });

    this.store.medicationLogs.set(1, {
      id: 1,
      plan_id: 1,
      user_id: 1001,
      medication_name: '苯磺酸氨氯地平片',
      dosage: '5mg',
      unit: '片',
      scheduled_time: `${todayStr} 08:00:00`,
      scheduled_date: todayStr,
      status: 'pending',
      actual_time: null,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    });

    // 8. 初始跌倒检测设置 (Fall Settings)
    this.store.fallSettings.set(1001, {
      sensitivity: 'medium',
      updatedAt: new Date().toISOString(),
    });

    // 9. 管理员会话 Redis 预置
    this.store.redisKeyVal.set('auth:admin:session:admin-sess-1', '1');
  }

  createToken(userId, extra = {}) {
    const payload = {
      userId,
      ...extra,
    };
    if (userId === 0) {
      payload.isAdmin = true;
      payload.role = 'admin';
      payload.sid = 'admin-sess-1';
    }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
  }

  createAuthHeader(userId, extra = {}) {
    return `Bearer ${this.createToken(userId, extra)}`;
  }
}

const mockHarness = new MockHarness();

module.exports = mockHarness;
