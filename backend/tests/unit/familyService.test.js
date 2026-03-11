'use strict';

jest.mock('../../src/models/family', () => ({
  listBindingsByFamilyId: jest.fn(),
  checkFamilyBinding: jest.fn(),
  getLatestHealthSnapshot: jest.fn(),
  getLatestLocation: jest.fn(),
  findNotificationSettingsByUserId: jest.fn(),
  upsertNotificationSettings: jest.fn(),
}));

jest.mock('../../src/models/familySpace', () => ({
  getInteractionEvidenceSummary: jest.fn(),
}));

jest.mock('../../src/models/sosEvent', () => ({
  listActiveByUser: jest.fn(),
}));

jest.mock('../../src/services/medicationLogService', () => ({
  getTodaySchedule: jest.fn(),
}));

const familyModel = require('../../src/models/family');
const familySpaceModel = require('../../src/models/familySpace');
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

  it('builds frozen elderly overview with summaries and alerts', async () => {
    familyModel.listBindingsByFamilyId.mockResolvedValue([
      {
        elderId: 3001,
        elderProfile: {
          realName: 'Wang Ayi',
          nickname: 'Ayi',
          avatarUrl: null,
        },
      },
      {
        elderId: 3002,
        elderProfile: {
          realName: 'Li Shushu',
          nickname: 'Shushu',
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
      address: 'Hangzhou Xihu',
      updatedAt: '2026-03-11T09:05:00.000Z',
    });
    familySpaceModel.getInteractionEvidenceSummary.mockResolvedValue({
      familyId: 3001,
      voiceMessageCount: 2,
      albumCount: 3,
      pointRecordCount: 5,
      lastInteractionAt: '2026-03-11T09:06:00.000Z',
    });
    medicationLogService.getTodaySchedule.mockResolvedValue([
      { status: 'taken', actualTime: '2026-03-11T08:00:00.000Z' },
      { status: 'pending', scheduledTime: '2026-03-11T12:00:00.000Z' },
    ]);
    SosEventModel.listActiveByUser.mockResolvedValue([
      {
        id: 88,
        trigger_type: 'manual',
        event_status: 'triggered',
        address: 'Hangzhou Wenyi Road',
        created_at: '2026-03-11T09:10:00.000Z',
      },
    ]);

    const data = await familyService.getElderlyOverview(2001, { elderId: 3001 });

    expect(medicationLogService.getTodaySchedule).toHaveBeenCalledWith(3001);
    expect(SosEventModel.listActiveByUser).toHaveBeenCalledWith(3001, 3);
    expect(familySpaceModel.getInteractionEvidenceSummary).toHaveBeenCalledWith(3001);
    expect(data.elderProfile).toMatchObject({
      elderId: 3001,
      familyId: 3001,
      name: 'Wang Ayi',
    });
    expect(data.todayHealthSummary.bloodPressure.status).toBe('warning');
    expect(data.medicationSummary.progress).toBe(50);
    expect(data.locationSummary.hasLocation).toBe(true);
    expect(data.alerts[0]).toMatchObject({
      type: 'sos',
      status: 'triggered',
    });
    expect(data.alerts[1]).toMatchObject({
      type: 'medication',
    });
    expect(data.interactionEvidenceSummary).toMatchObject({
      hasInteractionEvidence: true,
      voiceMessageCount: 2,
      albumCount: 3,
      pointRecordCount: 5,
    });
  });

  it('uses the first binding when elderId is not provided', async () => {
    familyModel.listBindingsByFamilyId.mockResolvedValue([
      {
        elderId: 3001,
        elderProfile: { realName: 'Primary Elder', nickname: null, avatarUrl: null },
      },
    ]);
    familyModel.getLatestHealthSnapshot.mockResolvedValue(null);
    familyModel.getLatestLocation.mockResolvedValue(null);
    familySpaceModel.getInteractionEvidenceSummary.mockResolvedValue(null);
    medicationLogService.getTodaySchedule.mockResolvedValue([]);
    SosEventModel.listActiveByUser.mockResolvedValue([]);

    const data = await familyService.getElderlyOverview(2001);

    expect(data.elderProfile.elderId).toBe(3001);
    expect(data.medicationSummary.progress).toBe(100);
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
