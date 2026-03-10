'use strict';

const reminderQueueModel = require('../models/reminderQueueModel');
const medicationLogModel = require('../models/medicationLogModel');
const wechatNotifier = require('../utils/wechatNotifier');

function buildReminderText(remindType) {
  if (remindType === 'second') {
    return '您还有一条用药提醒未确认，请尽快处理';
  }
  return '到服药时间了，请及时确认是否已服药';
}

const reminderNotificationService = {
  async sendFirstReminder(plan, log) {
    const queue = await reminderQueueModel.createTask({
      user_id: plan.user_id,
      plan_id: plan.id,
      log_id: log.id,
      remind_type: 'first',
      scheduled_at: new Date(),
      status: 'pending',
    });

    try {
      await wechatNotifier.sendMedicationReminder({
        userId: plan.user_id,
        medicationName: plan.medication_name,
        dosage: plan.dosage,
        scheduledTime: log.scheduled_time,
        remindType: 'first',
        remark: buildReminderText('first'),
      });

      await reminderQueueModel.markSent(queue.id);
      await medicationLogModel.markFirstReminderSent(log.id);

      return {
        success: true,
        queue_id: queue.id,
      };
    } catch (err) {
      await reminderQueueModel.markFailed(queue.id, err.message || '首提醒发送失败');
      return {
        success: false,
        queue_id: queue.id,
        error: err.message || '首提醒发送失败',
      };
    }
  },

  async sendSecondReminder(plan, log) {
    const queue = await reminderQueueModel.createTask({
      user_id: plan.user_id,
      plan_id: plan.id,
      log_id: log.id,
      remind_type: 'second',
      scheduled_at: new Date(),
      status: 'pending',
    });

    try {
      await wechatNotifier.sendMedicationReminder({
        userId: plan.user_id,
        medicationName: plan.medication_name,
        dosage: plan.dosage,
        scheduledTime: log.scheduled_time,
        remindType: 'second',
        remark: buildReminderText('second'),
      });

      await reminderQueueModel.markSent(queue.id);
      await medicationLogModel.markSecondReminderSent(log.id);

      return {
        success: true,
        queue_id: queue.id,
      };
    } catch (err) {
      await reminderQueueModel.markFailed(queue.id, err.message || '二次提醒发送失败');
      return {
        success: false,
        queue_id: queue.id,
        error: err.message || '二次提醒发送失败',
      };
    }
  },
};

module.exports = reminderNotificationService;
