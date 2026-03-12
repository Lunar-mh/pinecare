'use strict';

describe('familyNotificationService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  function loadService() {
    const FamilyBindingModel = {
      listApprovedFamilyReceiverIds: jest.fn(),
    };
    const medicationLogModel = {
      markFamilyNotified: jest.fn().mockResolvedValue(true),
    };
    const reminderQueueModel = {
      createTask: jest.fn().mockResolvedValue({ id: 17 }),
      markSent: jest.fn().mockResolvedValue(true),
      markFailed: jest.fn().mockResolvedValue(true),
    };
    const medicationSettingService = {
      getSettings: jest.fn(),
    };
    const wechatNotifier = {
      sendFamilyMissedReminder: jest.fn(),
    };

    jest.doMock('../../src/models/familyBinding', () => FamilyBindingModel);
    jest.doMock('../../src/models/medicationLogModel', () => medicationLogModel);
    jest.doMock('../../src/models/reminderQueueModel', () => reminderQueueModel);
    jest.doMock('../../src/services/medicationSettingService', () => medicationSettingService);
    jest.doMock('../../src/utils/wechatNotifier', () => wechatNotifier);

    const service = require('../../src/services/familyNotificationService');
    return {
      service,
      FamilyBindingModel,
      medicationLogModel,
      reminderQueueModel,
      medicationSettingService,
      wechatNotifier,
    };
  }

  it('skips when family sync is disabled', async () => {
    const { service, medicationSettingService } = loadService();
    medicationSettingService.getSettings.mockResolvedValueOnce({ family_sync_enabled: 0 });

    await expect(
      service.notifyMissedMedication({ id: 1, user_id: 8, plan_id: 3 }, { id: 3, medication_name: 'Aspirin' })
    ).resolves.toEqual({
      success: true,
      skipped: true,
      reason: 'Family sync disabled.',
    });
  });

  it('skips when no approved family receivers exist', async () => {
    const { service, medicationSettingService, FamilyBindingModel } = loadService();
    medicationSettingService.getSettings.mockResolvedValueOnce({ family_sync_enabled: 1 });
    FamilyBindingModel.listApprovedFamilyReceiverIds.mockResolvedValueOnce([]);

    await expect(
      service.notifyMissedMedication({ id: 1, user_id: 8, plan_id: 3 }, { id: 3, medication_name: 'Aspirin' })
    ).resolves.toEqual({
      success: true,
      skipped: true,
      reason: 'No approved family receivers found.',
    });
  });

  it('marks queue as sent when at least one family notification succeeds', async () => {
    const {
      service,
      medicationSettingService,
      FamilyBindingModel,
      reminderQueueModel,
      medicationLogModel,
      wechatNotifier,
    } = loadService();
    medicationSettingService.getSettings.mockResolvedValueOnce({ family_sync_enabled: 1 });
    FamilyBindingModel.listApprovedFamilyReceiverIds.mockResolvedValueOnce([11, 12]);
    wechatNotifier.sendFamilyMissedReminder
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Upstream temporary failure.'));

    await expect(
      service.notifyMissedMedication(
        { id: 9, user_id: 8, plan_id: 3, scheduled_time: '2026-03-12 10:00:00' },
        { id: 3, medication_name: 'Aspirin' }
      )
    ).resolves.toEqual({
      success: true,
      queue_id: 17,
      success_count: 1,
      fail_count: 1,
    });

    expect(reminderQueueModel.markSent).toHaveBeenCalledWith(17);
    expect(medicationLogModel.markFamilyNotified).toHaveBeenCalledWith(9);
  });

  it('marks queue as failed when all family notifications fail', async () => {
    const { service, medicationSettingService, FamilyBindingModel, reminderQueueModel, wechatNotifier } = loadService();
    medicationSettingService.getSettings.mockResolvedValueOnce({ family_sync_enabled: 1 });
    FamilyBindingModel.listApprovedFamilyReceiverIds.mockResolvedValueOnce([11, 12]);
    wechatNotifier.sendFamilyMissedReminder
      .mockRejectedValueOnce(new Error('First delivery failed.'))
      .mockRejectedValueOnce(new Error('Second delivery failed.'));

    await expect(
      service.notifyMissedMedication(
        { id: 9, user_id: 8, plan_id: 3, scheduled_time: '2026-03-12 10:00:00' },
        { id: 3, medication_name: 'Aspirin' }
      )
    ).resolves.toEqual({
      success: false,
      queue_id: 17,
      success_count: 0,
      fail_count: 2,
      errors: ['First delivery failed.', 'Second delivery failed.'],
    });

    expect(reminderQueueModel.markFailed).toHaveBeenCalledWith(
      17,
      'First delivery failed.; Second delivery failed.'
    );
  });
});
