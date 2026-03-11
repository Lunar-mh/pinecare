'use strict';

jest.mock('../../src/models/family', () => ({
  listBindingsByFamilyId: jest.fn(),
  checkFamilyBinding: jest.fn(),
  getLatestHealthSnapshot: jest.fn(),
  getLatestLocation: jest.fn(),
  findNotificationSettingsByUserId: jest.fn(),
  upsertNotificationSettings: jest.fn(),
}));

jest.mock('../../src/models/sosEvent', () => ({
  listActiveByUser: jest.fn(),
}));

jest.mock('../../src/services/medicationLogService', () => ({
  getTodaySchedule: jest.fn(),
}));

const familyModel = require('../../src/models/family');
const SosEventModel = require('../../src/models/sosEvent');
const medicationLogService = require('../../src/services/medicationLogService');
const familyService = require('../../src/services/familyService');

describe('familyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when family binding is missing for health access', async () => {
    familyModel.checkFamilyBinding.mockResolvedValue(false);

    await expect(familyService.getElderHealth(2001, 3001)).rejects.toMatchObject({
      code: 403,
      statusCode: 403,
    });
  });

  it('returns health snapshot when binding exists', async () => {
    familyModel.checkFamilyBinding.mockResolvedValue(true);
    familyModel.getLatestHealthSnapshot.mockResolvedValue({
      archive: { id: 9, userId: 3001 },
      latestRecords: [
        { metricType: 'heart_rate', value: '76' },
        { metricType: 'heart_rate', value: '75' },
        { metricType: 'blood_oxygen', value: '98' },
      ],
    });

    const data = await familyService.getElderHealth(2001, 3001);
    expect(data.elderId).toBe(3001);
    expect(data.archive.id).toBe(9);
    expect(data.latestMetrics.heart_rate.value).toBe('76');
    expect(data.latestMetrics.blood_oxygen.value).toBe('98');
  });

  it('builds elderly overview with sos alerts and medication progress', async () => {
    familyModel.listBindingsByFamilyId.mockResolvedValue([
      {
        elderId: 3001,
        elderProfile: {
          realName: '王阿姨',
          nickname: '王阿姨',
          avatarUrl: null,
        },
      },
    ]);
    familyModel.getLatestHealthSnapshot.mockResolvedValue({
      archive: { id: 9, userId: 3001, updatedAt: '2026-03-11T09:00:00.000Z' },
      latestRecords: [
        {
          id: 1,
          metricType: 'blood_pressure',
          valueHigh: 152,
          valueLow: 92,
          measuredAt: '2026-03-11T08:30:00.000Z',
        },
        {
          id: 2,
          metricType: 'heart_rate',
          value: '78',
          measuredAt: '2026-03-11T08:31:00.000Z',
        },
      ],
    });
    familyModel.getLatestLocation.mockResolvedValue({
      latitude: 30.1,
      longitude: 120.1,
      address: '杭州市西湖区',
      updatedAt: '2026-03-11T09:05:00.000Z',
    });
    medicationLogService.getTodaySchedule.mockResolvedValue([
      { status: 'taken' },
      { status: 'pending' },
    ]);
    SosEventModel.listActiveByUser.mockResolvedValue([
      {
        id: 88,
        trigger_type: 'manual',
        event_status: 'triggered',
        address: '杭州市西湖区文三路',
        created_at: '2026-03-11T09:10:00.000Z',
      },
    ]);

    const data = await familyService.getElderlyOverview(2001);

    expect(medicationLogService.getTodaySchedule).toHaveBeenCalledWith(3001);
    expect(SosEventModel.listActiveByUser).toHaveBeenCalledWith(3001, 3);
    expect(data.name).toBe('王阿姨');
    expect(data.todayHealth.medicationProgress).toBe(50);
    expect(data.alerts[0]).toMatchObject({
      type: 'sos',
      title: 'SOS 紧急求助进行中',
    });
    expect(data.alerts[1]).toMatchObject({
      type: 'medication',
    });
    expect(data.isOnline).toBe(true);
  });

  it('returns default notification settings when no record exists', async () => {
    familyModel.findNotificationSettingsByUserId.mockResolvedValue(null);

    const data = await familyService.getNotificationSettings(5001);
    expect(data).toEqual({
      userId: 5001,
      healthAlertEnabled: true,
      medicationReminderEnabled: true,
      sosAlertEnabled: true,
    });
  });

  it('normalizes whitelist fields when updating notification settings', async () => {
    familyModel.findNotificationSettingsByUserId.mockResolvedValue({
      userId: 5001,
      healthAlertEnabled: true,
      medicationReminderEnabled: true,
      sosAlertEnabled: true,
    });
    familyModel.upsertNotificationSettings.mockResolvedValue({
      userId: 5001,
      healthAlertEnabled: false,
      medicationReminderEnabled: true,
      sosAlertEnabled: false,
    });

    const data = await familyService.updateNotificationSettings(5001, {
      healthAlertEnabled: false,
      sos_alert_enabled: '0',
      illegalField: 'ignore-me',
    });

    expect(familyModel.upsertNotificationSettings).toHaveBeenCalledWith(5001, {
      healthAlertEnabled: false,
      medicationReminderEnabled: true,
      sosAlertEnabled: false,
    });
    expect(data.healthAlertEnabled).toBe(false);
    expect(data.sosAlertEnabled).toBe(false);
  });
});
