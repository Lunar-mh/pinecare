'use strict';

const loadService = () => {
  jest.resetModules();
  const redis = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
  const FallModel = {
    createFalseAlarmEvent: jest.fn(),
    createDetectingEvent: jest.fn(),
    findEventById: jest.fn(),
    findEventByIdAndUser: jest.fn(),
    markCancelled: jest.fn(),
    markConfirmed: jest.fn(),
    getNotificationContacts: jest.fn(),
    createNotificationRecords: jest.fn(),
    findNotificationsByEventId: jest.fn(),
    updateNotificationStatus: jest.fn(),
    countHistory: jest.fn(),
    listHistory: jest.fn(),
    getSensitivitySetting: jest.fn(),
    upsertSensitivitySetting: jest.fn(),
    findExpiredDetectingEvents: jest.fn(),
  };
  const notificationService = {
    sendSms: jest.fn().mockResolvedValue(undefined),
    sendWechat: jest.fn().mockResolvedValue(undefined),
  };
  const eventTimelineService = {
    recordCareEvent: jest.fn().mockResolvedValue(undefined),
  };

  jest.doMock('../../src/config/redis', () => redis);
  jest.doMock('../../src/models/fall', () => FallModel);
  jest.doMock('../../src/services/notificationService', () => notificationService);
  jest.doMock('../../src/services/eventTimelineService', () => eventTimelineService);

  const service = require('../../src/services/fallService');
  return { service, redis, FallModel, notificationService, eventTimelineService };
};

describe('fallService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('detects falls and validates sensitivity', () => {
    const { service } = loadService();
    expect(service.detectFall({ verticalPeak: 3.5, horizontalChangeRate: 2.5 }, 'medium')).toEqual({
      isFall: true,
      verticalPeak: 3.5,
      horizontalChangeRate: 2.5,
      threshold: { vertical: 3, horizontal: 2 },
      sensitivity: 'medium',
    });
    expect(service.detectFall({ x: [0, 3], y: [0, 4], z: [0, 5], timestamps: [0, 1000] }, 'high')).toMatchObject({
      isFall: true,
      verticalPeak: 5,
    });
    expect(() => service.detectFall({}, 'weird')).toThrow();
  });

  it('reports false alarms and detecting events with unified audit', async () => {
    let loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(null);
    loaded.FallModel.getSensitivitySetting.mockResolvedValueOnce({ sensitivity: 'medium', updatedAt: 'u' });
    loaded.FallModel.createFalseAlarmEvent.mockResolvedValueOnce(5);
    loaded.FallModel.findEventById.mockResolvedValueOnce({ id: 5, status: 'false_alarm', detectedAt: '2026-03-11T10:00:00.000Z' });
    await expect(loaded.service.reportFall(7, { verticalPeak: 1, horizontalChangeRate: 1 })).resolves.toEqual({
      detected: false,
      reason: 'no-fall',
      event: { id: 5, status: 'false_alarm', detectedAt: '2026-03-11T10:00:00.000Z' },
      detection: expect.objectContaining({ isFall: false }),
    });
    expect(loaded.eventTimelineService.recordCareEvent).toHaveBeenCalledWith(
      'fall.false_alarm',
      expect.objectContaining({ entityId: 5, status: 'false_alarm' })
    );

    loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(JSON.stringify({ sensitivity: 'high', updatedAt: 'u' }));
    loaded.FallModel.createDetectingEvent.mockResolvedValueOnce(6);
    loaded.FallModel.findEventById.mockResolvedValueOnce({ id: 6, status: 'detecting', detectedAt: '2026-03-11T10:01:00.000Z' });
    await expect(loaded.service.reportFall(7, { verticalPeak: 3, horizontalChangeRate: 2 })).resolves.toMatchObject({
      detected: true,
      event: { id: 6, status: 'detecting' },
      countdownSeconds: 15,
    });
    expect(loaded.eventTimelineService.recordCareEvent).toHaveBeenCalledWith(
      'fall.detected',
      expect.objectContaining({ entityId: 6, status: 'detecting' })
    );
    await expect(loaded.service.reportFall(null, {})).rejects.toMatchObject({ code: 401 });
  });

  it('cancels only detecting events owned by the user', async () => {
    let loaded = loadService();
    await expect(loaded.service.cancelFall(7, 'bad')).rejects.toMatchObject({ code: 400 });

    loaded = loadService();
    loaded.FallModel.findEventByIdAndUser.mockResolvedValueOnce(null);
    await expect(loaded.service.cancelFall(7, 5)).rejects.toMatchObject({ code: 404 });

    loaded = loadService();
    loaded.FallModel.findEventByIdAndUser.mockResolvedValueOnce({ id: 5, status: 'confirmed' });
    await expect(loaded.service.cancelFall(7, 5)).rejects.toMatchObject({ code: 409 });

    loaded = loadService();
    loaded.FallModel.findEventByIdAndUser.mockResolvedValueOnce({ id: 5, status: 'detecting' });
    loaded.FallModel.markCancelled.mockResolvedValueOnce(true);
    loaded.FallModel.findEventByIdAndUser.mockResolvedValueOnce({ id: 5, status: 'cancelled', cancelledAt: '2026-03-11T10:02:00.000Z' });
    await expect(loaded.service.cancelFall(7, 5)).resolves.toEqual({
      event: { id: 5, status: 'cancelled', cancelledAt: '2026-03-11T10:02:00.000Z' },
      cancelled: true,
    });
    expect(loaded.eventTimelineService.recordCareEvent).toHaveBeenCalledWith(
      'fall.cancelled',
      expect.objectContaining({ entityId: 5, status: 'cancelled' })
    );
  });

  it('processes pending falls and records notification outcomes', async () => {
    let loaded = loadService();
    await expect(loaded.service.processPendingFall('bad')).resolves.toEqual({ processed: false, reason: 'invalid-event-id' });

    loaded = loadService();
    loaded.FallModel.findEventById.mockResolvedValueOnce(null);
    await expect(loaded.service.processPendingFall(5)).resolves.toEqual({ processed: false, reason: 'not-found' });

    loaded = loadService();
    loaded.FallModel.findEventById.mockResolvedValueOnce({ id: 5, status: 'confirmed' });
    await expect(loaded.service.processPendingFall(5)).resolves.toEqual({ processed: false, reason: 'already-processed', event: { id: 5, status: 'confirmed' } });

    loaded = loadService();
    loaded.FallModel.findEventById.mockResolvedValueOnce({ id: 5, status: 'detecting' });
    loaded.FallModel.markConfirmed.mockResolvedValueOnce(false);
    await expect(loaded.service.processPendingFall(5)).resolves.toEqual({ processed: false, reason: 'race-lost', event: { id: 5, status: 'detecting' } });

    loaded = loadService();
    loaded.FallModel.findEventById
      .mockResolvedValueOnce({ id: 5, status: 'detecting' })
      .mockResolvedValueOnce({ id: 5, status: 'confirmed', userId: 7, confirmedAt: '2026-03-11T10:03:00.000Z' });
    loaded.FallModel.markConfirmed.mockResolvedValueOnce(true);
    loaded.FallModel.getNotificationContacts.mockResolvedValueOnce([
      { contactId: 1, notifyMethod: 'sms' },
      { contactId: 2, notifyMethod: 'wechat' },
    ]);
    loaded.FallModel.createNotificationRecords.mockResolvedValueOnce(undefined);
    loaded.FallModel.findNotificationsByEventId.mockResolvedValueOnce([
      { id: 11, contactId: 1, notifyMethod: 'sms' },
      { id: 12, contactId: 2, notifyMethod: 'wechat' },
      { id: 13, contactId: 9, notifyMethod: 'sms' },
    ]);
    loaded.notificationService.sendWechat.mockRejectedValueOnce(new Error('failed'));
    await expect(loaded.service.processPendingFall(5)).resolves.toEqual({
      processed: true,
      event: { id: 5, status: 'confirmed', userId: 7, confirmedAt: '2026-03-11T10:03:00.000Z' },
      notification: { total: 3, sent: 1, failed: 2 },
    });
    expect(loaded.eventTimelineService.recordCareEvent).toHaveBeenCalledWith(
      'fall.confirmed',
      expect.objectContaining({
        entityId: 5,
        status: 'confirmed',
        details: expect.objectContaining({ delivery: { total: 3, sent: 1, failed: 2 } }),
      })
    );
  });

  it('returns paged history and caches settings updates', async () => {
    let loaded = loadService();
    loaded.FallModel.countHistory.mockResolvedValueOnce(3);
    loaded.FallModel.listHistory.mockResolvedValueOnce([{ id: 1 }]);
    await expect(loaded.service.getFallHistory(7, { page: '2', pageSize: '2', status: 'confirmed' })).resolves.toEqual({
      list: [{ id: 1 }],
      pagination: { page: 2, pageSize: 2, total: 3, totalPages: 2 },
    });
    await expect(loaded.service.getFallHistory(7, { status: 'bad' })).rejects.toMatchObject({ code: 400 });

    loaded = loadService();
    loaded.redis.get.mockRejectedValueOnce(new Error('cache down'));
    loaded.FallModel.getSensitivitySetting.mockResolvedValueOnce(null);
    await expect(loaded.service.getFallSettings(7)).resolves.toEqual({ sensitivity: 'medium', updatedAt: null });

    loaded = loadService();
    loaded.FallModel.upsertSensitivitySetting.mockResolvedValueOnce(undefined);
    loaded.FallModel.getSensitivitySetting.mockResolvedValueOnce({ sensitivity: 'low', updatedAt: 'u' });
    await expect(loaded.service.updateFallSettings(7, 'low')).resolves.toEqual({ sensitivity: 'low', updatedAt: 'u' });
  });

  it('starts and stops countdown worker safely', async () => {
    jest.useFakeTimers();
    const loaded = loadService();
    loaded.FallModel.findExpiredDetectingEvents.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const processSpy = jest.spyOn(loaded.service, 'processPendingFall').mockResolvedValue(undefined);
    loaded.service.startCountdownWorker();
    await jest.advanceTimersByTimeAsync(1000);
    expect(processSpy).toHaveBeenCalledWith(1);
    expect(processSpy).toHaveBeenCalledWith(2);
    loaded.service.startCountdownWorker();
    loaded.service.stopCountdownWorker();
    processSpy.mockRestore();
  });
});
