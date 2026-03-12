'use strict';

const FamilyBindingModel = require('../models/familyBinding');
const medicationLogModel = require('../models/medicationLogModel');
const reminderQueueModel = require('../models/reminderQueueModel');
const medicationSettingService = require('./medicationSettingService');
const wechatNotifier = require('../utils/wechatNotifier');

const SKIP_REASON_FAMILY_SYNC_DISABLED = 'Family sync disabled.';
const SKIP_REASON_NO_RECEIVERS = 'No approved family receivers found.';
const DEFAULT_DELIVERY_ERROR = 'Family notification delivery failed.';

const familyNotificationService = {
  async notifyMissedMedication(log, plan) {
    const settings = await medicationSettingService.getSettings(log.user_id);

    if (Number(settings.family_sync_enabled) !== 1) {
      return {
        success: true,
        skipped: true,
        reason: SKIP_REASON_FAMILY_SYNC_DISABLED,
      };
    }

    const familyUserIds = await FamilyBindingModel.listApprovedFamilyReceiverIds(log.user_id);
    if (familyUserIds.length === 0) {
      return {
        success: true,
        skipped: true,
        reason: SKIP_REASON_NO_RECEIVERS,
      };
    }

    const queue = await reminderQueueModel.createTask({
      user_id: log.user_id,
      plan_id: plan ? plan.id : log.plan_id,
      log_id: log.id,
      remind_type: 'family',
      scheduled_at: new Date(),
      status: 'pending',
    });

    let successCount = 0;
    const errors = [];

    for (const familyUserId of familyUserIds) {
      try {
        await wechatNotifier.sendFamilyMissedReminder({
          familyUserId,
          elderUserId: log.user_id,
          medicationName: plan ? plan.medication_name : log.medication_name,
          scheduledTime: log.scheduled_time,
        });
        successCount += 1;
      } catch (err) {
        errors.push(err.message || DEFAULT_DELIVERY_ERROR);
      }
    }

    if (successCount > 0) {
      await reminderQueueModel.markSent(queue.id);
      await medicationLogModel.markFamilyNotified(log.id);
      return {
        success: true,
        queue_id: queue.id,
        success_count: successCount,
        fail_count: familyUserIds.length - successCount,
      };
    }

    await reminderQueueModel.markFailed(queue.id, errors.join('; ') || DEFAULT_DELIVERY_ERROR);
    return {
      success: false,
      queue_id: queue.id,
      success_count: 0,
      fail_count: familyUserIds.length,
      errors,
    };
  },
};

module.exports = familyNotificationService;
