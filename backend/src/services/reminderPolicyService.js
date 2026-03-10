'use strict';

const medicationSettingService = require('./medicationSettingService');

function toSeconds(timeText) {
  const text = String(timeText || '00:00:00');
  const parts = text.split(':').map((item) => Number(item));
  const hour = parts[0] || 0;
  const minute = parts[1] || 0;
  const second = parts[2] || 0;
  return hour * 3600 + minute * 60 + second;
}

function formatNowToHHmmss(now) {
  const d = now instanceof Date ? now : new Date(now);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function isInSleepWindow(nowTime, sleepStart, sleepEnd) {
  const current = toSeconds(nowTime);
  const start = toSeconds(sleepStart);
  const end = toSeconds(sleepEnd);

  if (start === end) {
    return false;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

const reminderPolicyService = {
  isInSleepWindow,

  async checkUserReminderPermission(userId, now) {
    const settings = await medicationSettingService.getSettings(userId);
    const nowTime = formatNowToHHmmss(now || new Date());

    if (Number(settings.reminder_enabled) !== 1) {
      return {
        allowed: false,
        reason: '提醒开关已关闭',
        settings,
      };
    }

    if (isInSleepWindow(nowTime, settings.sleep_start, settings.sleep_end)) {
      return {
        allowed: false,
        reason: '当前处于睡眠时段',
        settings,
      };
    }

    return {
      allowed: true,
      reason: '允许发送提醒',
      settings,
    };
  },
};

module.exports = reminderPolicyService;
