'use strict';

jest.mock('../../src/models/family', () => ({
  listBindingsByFamilyId: jest.fn(),
  checkFamilyBinding: jest.fn(),
  getLatestHealthSnapshot: jest.fn(),
  findNotificationSettingsByUserId: jest.fn(),
  upsertNotificationSettings: jest.fn(),
}));

const familyModel = require('../../src/models/family');
const familyService = require('../../src/services/familyService');

describe('familyService 单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('无绑定关系时查询健康数据返回 403 业务错误', async () => {
    familyModel.checkFamilyBinding.mockResolvedValue(false);

    await expect(familyService.getElderHealth(2001, 3001)).rejects.toMatchObject({
      code: 403,
      statusCode: 403,
      message: '无权访问该老人健康数据',
    });
  });

  it('有绑定关系且存在档案时返回健康快照', async () => {
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

  it('通知设置无记录时返回默认值', async () => {
    familyModel.findNotificationSettingsByUserId.mockResolvedValue(null);

    const data = await familyService.getNotificationSettings(5001);
    expect(data).toEqual({
      userId: 5001,
      healthAlertEnabled: true,
      medicationReminderEnabled: true,
      sosAlertEnabled: true,
    });
  });

  it('更新通知设置时执行字段白名单与布尔归一化', async () => {
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
