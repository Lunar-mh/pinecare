'use strict';

const { query } = require('../config/database');
const medicationLogModel = require('../models/medicationLogModel');
const reminderQueueModel = require('../models/reminderQueueModel');
const medicationSettingService = require('./medicationSettingService');
const wechatNotifier = require('../utils/wechatNotifier');

async function listFamilyReceivers(elderUserId) {
  const [rows] = await query(
    `SELECT u.id AS family_user_id
     FROM family_bindings fb
     INNER JOIN users u ON u.id = fb.family_user_id
     WHERE fb.elder_user_id = ?
       AND fb.binding_status = 'approved'
       AND u.openid IS NOT NULL`,
    [elderUserId]
  );

  return rows.map((item) => Number(item.family_user_id));
}

const familyNotificationService = {
  async notifyMissedMedication(log, plan) {
    const settings = await medicationSettingService.getSettings(log.user_id);

    if (Number(settings.family_sync_enabled) !== 1) {
      return {
        success: true,
        skipped: true,
        reason: '家属同步未开启',
      };
    }

    const familyUserIds = await listFamilyReceivers(log.user_id);
    if (familyUserIds.length === 0) {
      return {
        success: true,
        skipped: true,
        reason: '未找到已绑定家属',
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
        errors.push(err.message || '家属通知发送失败');
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

    await reminderQueueModel.markFailed(queue.id, errors.join('；') || '家属通知发送失败');
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
