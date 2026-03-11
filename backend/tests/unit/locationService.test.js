'use strict';

const loadService = () => {
  jest.resetModules();
  const locationRecordModel = {
    insert: jest.fn(),
    getLatest: jest.fn(),
  };
  const geoFenceModel = {
    getActiveByUserId: jest.fn(),
  };
  const fenceAlertModel = {
    create: jest.fn(),
  };
  const locationCacheService = {
    getCurrentLocation: jest.fn(),
    setCurrentLocation: jest.fn(),
  };
  const eventTimelineService = {
    recordCareEvent: jest.fn().mockResolvedValue(undefined),
  };

  jest.doMock('../../src/models/locationRecordModel', () => locationRecordModel);
  jest.doMock('../../src/models/geoFenceModel', () => geoFenceModel);
  jest.doMock('../../src/models/fenceAlertModel', () => fenceAlertModel);
  jest.doMock('../../src/services/locationCacheService', () => locationCacheService);
  jest.doMock('../../src/services/eventTimelineService', () => eventTimelineService);

  const service = require('../../src/services/locationService');
  return { service, locationRecordModel, geoFenceModel, fenceAlertModel, locationCacheService, eventTimelineService };
};

describe('locationService', () => {
  it('uploads location, creates fence alerts, and records unified audit', async () => {
    const loaded = loadService();
    loaded.locationCacheService.getCurrentLocation.mockResolvedValueOnce({ latitude: 30.0, longitude: 120.0 });
    loaded.locationRecordModel.insert.mockResolvedValueOnce({
      id: 9,
      latitude: 30.1,
      longitude: 120.2,
      accuracy: 15,
      locationType: 'gps',
      createdAt: '2026-03-11T10:00:00.000Z',
    });
    loaded.geoFenceModel.getActiveByUserId.mockResolvedValueOnce([
      { id: 7, fenceType: 'circle', centerLat: 30.0, centerLng: 120.0, radius: 10, alertType: 'exit', lastInside: true },
    ]);
    loaded.fenceAlertModel.create.mockResolvedValueOnce({ id: 55, alertType: 'exit' });

    const result = await loaded.service.upload(12, {
      latitude: 30.1,
      longitude: 120.2,
      accuracy: 15,
      locationType: 'gps',
    });

    expect(result).toEqual({
      location: {
        userId: 12,
        latitude: 30.1,
        longitude: 120.2,
        accuracy: 15,
        locationType: 'gps',
        createdAt: '2026-03-11T10:00:00.000Z',
      },
      alerts: [{ id: 55, alertType: 'exit' }],
    });
    expect(loaded.locationCacheService.setCurrentLocation).toHaveBeenCalled();
    expect(loaded.eventTimelineService.recordCareEvent).toHaveBeenCalledWith(
      'location.upload',
      expect.objectContaining({
        userId: 12,
        entityType: 'location',
        entityId: 9,
        details: expect.objectContaining({ alertsTriggered: 1, alertIds: [55] }),
      })
    );
  });

  it('falls back to db latest location when cache read fails', async () => {
    const loaded = loadService();
    loaded.locationCacheService.getCurrentLocation.mockRejectedValueOnce(new Error('cache down'));
    loaded.locationRecordModel.getLatest.mockResolvedValueOnce({ latitude: 29.9, longitude: 119.9 });
    loaded.locationRecordModel.insert.mockResolvedValueOnce({
      id: 10,
      latitude: 30.1,
      longitude: 120.2,
      accuracy: null,
      locationType: 'wifi',
      createdAt: '2026-03-11T10:10:00.000Z',
    });
    loaded.geoFenceModel.getActiveByUserId.mockResolvedValueOnce([]);

    const result = await loaded.service.upload(12, {
      latitude: 30.1,
      longitude: 120.2,
      locationType: 'wifi',
    });

    expect(result.location.locationType).toBe('wifi');
    expect(loaded.locationRecordModel.getLatest).toHaveBeenCalledWith(12);
  });

  it('returns cached current location first and validates bad payloads', async () => {
    let loaded = loadService();
    loaded.locationCacheService.getCurrentLocation.mockResolvedValueOnce({ latitude: 30.1, longitude: 120.2 });
    await expect(loaded.service.getCurrent(12)).resolves.toEqual({ latitude: 30.1, longitude: 120.2 });

    loaded = loadService();
    await expect(loaded.service.upload(12, { latitude: 'bad', longitude: 120.2 })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.upload(12, { latitude: 30.1, longitude: 120.2, locationType: 'invalid' })).rejects.toMatchObject({ code: 400 });
  });
});

