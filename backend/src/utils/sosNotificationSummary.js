'use strict';

function createEmptySosNotificationSummary() {
  return {
    wechat: { pending: 0, sent: 0, failed: 0 },
    sms: { pending: 0, sent: 0, failed: 0 },
    total: { pending: 0, sent: 0, failed: 0 },
  };
}

function buildSosNotificationSummaryMap(summaryRows = []) {
  const summaryMap = {};

  summaryRows.forEach((row) => {
    const eventId = Number(row.sos_event_id);
    if (!summaryMap[eventId]) {
      summaryMap[eventId] = createEmptySosNotificationSummary();
    }

    const pending = Number(row.pending_count) || 0;
    const sent = Number(row.sent_count) || 0;
    const failed = Number(row.failed_count) || 0;
    const channel = row.notify_type === 'wechat' ? 'wechat' : 'sms';

    summaryMap[eventId][channel] = { pending, sent, failed };
    summaryMap[eventId].total.pending += pending;
    summaryMap[eventId].total.sent += sent;
    summaryMap[eventId].total.failed += failed;
  });

  return summaryMap;
}

module.exports = {
  buildSosNotificationSummaryMap,
  createEmptySosNotificationSummary,
};
