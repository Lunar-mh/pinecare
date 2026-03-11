'use strict';

async function dispatchNotifications({ FallModel, notificationService, latestEvent, contacts, notifications }) {
  let sentCount = 0;
  let failedCount = 0;

  for (const record of notifications) {
    const contact = contacts.find(
      (item) => item.contactId === record.contactId && item.notifyMethod === record.notifyMethod
    );

    if (!contact) {
      await FallModel.updateNotificationStatus(record.id, 'failed');
      failedCount += 1;
      continue;
    }

    try {
      if (record.notifyMethod === 'sms') {
        await notificationService.sendSms(contact, latestEvent);
      } else {
        await notificationService.sendWechat(contact, latestEvent);
      }
      await FallModel.updateNotificationStatus(record.id, 'sent');
      sentCount += 1;
    } catch (_error) {
      await FallModel.updateNotificationStatus(record.id, 'failed');
      failedCount += 1;
    }
  }

  return {
    total: notifications.length,
    sent: sentCount,
    failed: failedCount,
  };
}

module.exports = {
  dispatchNotifications,
};
