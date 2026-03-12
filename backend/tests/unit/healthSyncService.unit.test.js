'use strict';

jest.mock('../../src/models/healthRecordModel', () => ({
  batchInsert: jest.fn(),
}));
jest.mock('../../src/models/deviceBindingModel', () => ({
  findBoundDevice: jest.fn(),
  updateLastSync: jest.fn(),
}));
jest.mock('../../src/utils/healthAlert', () => ({
  collectAlerts: jest.fn(() => [{ metricType: 'blood_pressure' }]),
}));

const healthRecordModel = require('../../src/models/healthRecordModel');
const deviceBindingModel = require('../../src/models/deviceBindingModel');
const { collectAlerts } = require('../../src/utils/healthAlert');
const service = require('../../src/services/healthSyncService');

describe('healthSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    healthRecordModel.batchInsert.mockResolvedValue(2);
    deviceBindingModel.findBoundDevice.mockResolvedValue({ id: 10 });
    deviceBindingModel.updateLastSync.mockResolvedValue(true);
  });

  it('syncs normalized device records and updates device sync time', async () => {
    const result = await service.sync(7, {
      deviceId: 10,
      records: [
        { metricType: 'blood_pressure', value: '138/88' },
        { metricType: 'heart_rate', value: '72', deviceId: 11 },
      ],
    });

    expect(deviceBindingModel.findBoundDevice).toHaveBeenCalledTimes(2);
    expect(healthRecordModel.batchInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 7,
        metricType: 'blood_pressure',
        valueHigh: 138,
        valueLow: 88,
        deviceId: 10,
      }),
      expect.objectContaining({
        userId: 7,
        metricType: 'heart_rate',
        value: '72',
        deviceId: 11,
      }),
    ]);
    expect(deviceBindingModel.updateLastSync).toHaveBeenCalledTimes(2);
    expect(collectAlerts).toHaveBeenCalled();
    expect(result).toMatchObject({
      insertedCount: 2,
      deviceIds: [10, 11],
      alerts: [{ metricType: 'blood_pressure' }],
    });
  });

  it('rejects empty record arrays and invalid metric payloads', async () => {
    await expect(service.sync(7, { records: [] })).rejects.toMatchObject({ code: 400 });
    await expect(
      service.sync(7, { deviceId: 10, records: [{ metricType: 'unknown', value: '1' }] })
    ).rejects.toMatchObject({ code: 400 });
    await expect(
      service.sync(7, { deviceId: 10, records: [{ metricType: 'steps', value: '' }] })
    ).rejects.toMatchObject({ code: 400 });
    await expect(
      service.sync(7, { records: [{ metricType: 'steps', value: '100', deviceId: 'bad' }] })
    ).rejects.toMatchObject({ code: 400 });
  });

  it('rejects unbound devices before writing records', async () => {
    deviceBindingModel.findBoundDevice.mockResolvedValueOnce(null);

    await expect(
      service.sync(7, { deviceId: 10, records: [{ metricType: 'steps', value: '1000' }] })
    ).rejects.toMatchObject({ code: 403 });

    expect(healthRecordModel.batchInsert).not.toHaveBeenCalled();
  });
});
