'use strict';

const redis = require('../config/redis');
const redisKeys = require('../config/redisKeys');
const EmergencyContactModel = require('../models/emergencyContact');
const SosNotificationModel = require('../models/sosNotification');
const sosQueueService = require('./sosQueueService');
const wechatNotifyService = require('./wechatNotifyService');
const smsNotifyService = require('./smsNotifyService');

const CHANNELS = ['wechat', 'sms'];
const MAX_RETRY = parseInt(process.env.SOS_NOTIFY_MAX_RETRY || '2', 10);
const DEDUPE_TTL_SECONDS = parseInt(process.env.SOS_NOTIFY_DEDUPE_TTL_SECONDS || String(redisKeys.TTL.SOS_NOTIFY_DEDUPE), 10);

async function ensureRedisReady() {
  if (redis.status === 'ready' || redis.status === 'connect') {
    return;
  }

  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
}

function buildNotificationRecords(event, contacts) {
  const records = [];

  contacts.forEach((contact) => {
    CHANNELS.forEach((notifyType) => {
      records.push({
        sos_event_id: event.id,
        contact_id: contact.id,
        contact_name: contact.name || '未命名联系人',
        notify_type: notifyType,
        notify_target:
          notifyType === 'wechat'
            ? contact.wechat_openid || contact.wechatOpenId || null
            : contact.phone || null,
        status: 'pending',
        retry_count: 0,
      });
    });
  });

  return records;
}

function buildQueueTasks(event, records, notificationIds) {
  return notificationIds.map((notificationId, index) => {
    const record = records[index];
    return {
      notification_id: notificationId,
      sos_event_id: event.id,
      contact_id: record.contact_id,
      contact_name: record.contact_name,
      notify_type: record.notify_type,
      notify_target: record.notify_target,
      retry_count: 0,
      event_snapshot: {
        event_id: event.id,
        address: event.address,
        latitude: event.latitude,
        longitude: event.longitude,
        triggered_at: event.created_at,
      },
    };
  });
}

async function sendByChannel(task) {
  const payload = {
    event_id: task.sos_event_id,
    contact_name: task.contact_name,
    address: task.event_snapshot.address,
    latitude: task.event_snapshot.latitude,
    longitude: task.event_snapshot.longitude,
    triggered_at: task.event_snapshot.triggered_at,
  };

  if (task.notify_type === 'wechat') {
    await wechatNotifyService.sendWechatNotification({
      ...payload,
      open_id: task.notify_target,
    });
    return;
  }

  await smsNotifyService.sendSmsNotification({
    ...payload,
    phone: task.notify_target,
  });
}

async function consumeTask(task) {
  if (!task || !task.notification_id) {
    return { success: false, reason: 'task-invalid' };
  }

  const notification = await SosNotificationModel.findById(task.notification_id);
  if (!notification) {
    return { success: false, reason: 'notification-not-found' };
  }

  if (notification.status === 'sent') {
    return { success: true, reason: 'already-sent' };
  }

  await ensureRedisReady();
  const dedupeKey = redisKeys.sosNotifyDedupe(task.notification_id, task.retry_count || 0);
  const dedupeResult = await redis.set(dedupeKey, '1', 'NX', 'EX', DEDUPE_TTL_SECONDS);
  if (dedupeResult !== 'OK') {
    return { success: false, reason: 'duplicate-task' };
  }

  try {
    await sendByChannel(task);
    await SosNotificationModel.updateStatus(task.notification_id, 'sent', {
      incrementRetry: false,
      errorMessage: null,
    });
    return { success: true };
  } catch (err) {
    await SosNotificationModel.updateStatus(task.notification_id, 'failed', {
      incrementRetry: true,
      errorMessage: err.message || '发送失败',
    });

    const nextRetry = Number(task.retry_count || 0) + 1;
    if (nextRetry <= MAX_RETRY) {
      await sosQueueService.requeue({
        ...task,
        retry_count: nextRetry,
      });
    }

    return {
      success: false,
      reason: 'send-failed',
      error: err.message,
      retry_count: nextRetry,
    };
  }
}

async function createAndDispatch(event) {
  const contacts = await EmergencyContactModel.listByUserId(event.user_id);

  if (!contacts || contacts.length === 0) {
    return {
      contacts_total: 0,
      notifications_total: 0,
      queued: 0,
    };
  }

  const records = buildNotificationRecords(event, contacts);
  const notificationIds = await SosNotificationModel.batchCreate(records);
  const queueTasks = buildQueueTasks(event, records, notificationIds);

  await sosQueueService.enqueueBatch(queueTasks);

  return {
    contacts_total: contacts.length,
    notifications_total: notificationIds.length,
    queued: queueTasks.length,
  };
}

module.exports = {
  createAndDispatch,
  consumeTask,
};
