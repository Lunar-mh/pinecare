'use strict';

const redis = require('../config/redis');
const redisKeys = require('../config/redisKeys');
const medicationPlanModel = require('../models/medicationPlanModel');
const medicationSettingService = require('./medicationSettingService');
const reminderQueueModel = require('../models/reminderQueueModel');
const wechatNotifier = require('../utils/wechatNotifier');

function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function acquireDailyLock(planId, dateText) {
  const key = redisKeys.refillReminder(planId, 'plan', dateText);

  try {
    const result = await redis.set(key, '1', 'EX', redisKeys.TTL.REFILL_REMINDER, 'NX');
    return result === 'OK';
  } catch (err) {
    return true;
  }
}

const refillReminderService = {
  async runDaily(now) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    const dateText = formatDate(current);

    const plans = await medicationPlanModel.listRefillCandidates();
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const plan of plans) {
      const allowed = await acquireDailyLock(plan.id, dateText);
      if (!allowed) {
        skipped += 1;
        continue;
      }

      const settings = await medicationSettingService.getSettings(plan.user_id);
      if (Number(settings.reminder_enabled) !== 1) {
        skipped += 1;
        continue;
      }

      const queue = await reminderQueueModel.createTask({
        user_id: plan.user_id,
        plan_id: plan.id,
        log_id: null,
        remind_type: 'refill',
        scheduled_at: current,
        status: 'pending',
      });

      try {
        await wechatNotifier.sendRefillReminder({
          userId: plan.user_id,
          medicationName: plan.medication_name,
          remainingQuantity: plan.remaining_quantity,
          reminderThreshold: plan.reminder_threshold,
        });
        await reminderQueueModel.markSent(queue.id);
        sent += 1;
      } catch (err) {
        await reminderQueueModel.markFailed(queue.id, err.message || '续药提醒发送失败');
        failed += 1;
      }
    }

    return {
      date: dateText,
      total: plans.length,
      sent,
      skipped,
      failed,
    };
  },
};

module.exports = refillReminderService;
