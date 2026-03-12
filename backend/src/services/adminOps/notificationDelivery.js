'use strict';

const { createEmptySosNotificationSummary } = require('../../utils/sosNotificationSummary');

const EMPTY_SUMMARY = createEmptySosNotificationSummary();

function createEmptyDelivery(summary = EMPTY_SUMMARY) {
  return {
    totalRecords: 0,
    sentCount: summary.total.sent,
    pendingCount: summary.total.pending,
    failedCount: summary.total.failed,
    lastAttemptAt: null,
    channels: {
      wechat: summary.wechat,
      sms: summary.sms,
    },
    failedRecipients: [],
  };
}

function buildNotificationDetailMap(rows = [], summaryMap = {}) {
  const detailMap = {};

  rows.forEach((row) => {
    const eventId = Number(row.sos_event_id);
    if (!detailMap[eventId]) {
      detailMap[eventId] = createEmptyDelivery(summaryMap[eventId] || EMPTY_SUMMARY);
    }

    const detail = detailMap[eventId];
    detail.totalRecords += 1;

    const updatedAt = row.updated_at || row.sent_at || row.created_at || null;
    if (updatedAt && (!detail.lastAttemptAt || new Date(updatedAt).getTime() > new Date(detail.lastAttemptAt).getTime())) {
      detail.lastAttemptAt = updatedAt;
    }

    if (String(row.status || '') === 'failed') {
      detail.failedRecipients.push({
        notificationId: Number(row.id),
        channel: row.notify_type === 'wechat' ? 'wechat' : 'sms',
        target: row.notify_target || null,
        contactName: row.contact_name || null,
        retryCount: Number(row.retry_count) || 0,
        errorMessage: row.error_message || null,
        status: row.status,
      });
    }
  });

  Object.keys(summaryMap).forEach((eventId) => {
    if (!detailMap[eventId]) {
      detailMap[eventId] = createEmptyDelivery(summaryMap[eventId]);
    }
  });

  return detailMap;
}

module.exports = {
  EMPTY_SUMMARY,
  createEmptyDelivery,
  buildNotificationDetailMap,
};
