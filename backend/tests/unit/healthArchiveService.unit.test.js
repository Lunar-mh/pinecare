'use strict';

jest.mock('../../src/models/healthRecordModel', () => ({
  getTodayRecords: jest.fn(),
  getTrendData: jest.fn(),
  getLatestByMetricType: jest.fn(),
}));
jest.mock('../../src/utils/healthAlert', () => ({
  collectAlerts: jest.fn((records) => records.map((item) => ({ metricType: item.metricType || 'x' }))),
}));

const healthRecordModel = require('../../src/models/healthRecordModel');
const service = require('../../src/services/healthArchiveService');

describe('healthArchiveService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds today snapshot and keeps latest metric entries', async () => {
    healthRecordModel.getTodayRecords.mockResolvedValue([
      { metricType: 'heart_rate', value: '75' },
      { metricType: 'heart_rate', value: '80' },
      { metricType: 'blood_pressure', valueHigh: 135, valueLow: 88 },
    ]);

    const result = await service.getToday(7);

    expect(result).toMatchObject({
      userId: 7,
      recordsCount: 3,
      metrics: {
        heart_rate: { value: '75' },
        blood_pressure: { valueHigh: 135, valueLow: 88 },
      },
    });
    expect(result.alerts).toHaveLength(2);
  });

  it('validates trend filters and returns trend payload', async () => {
    await expect(service.getTrend(7, 'invalid', '7d')).rejects.toMatchObject({ code: 400 });
    await expect(service.getTrend(7, 'steps', '365d')).rejects.toMatchObject({ code: 400 });

    healthRecordModel.getTrendData.mockResolvedValue([{ metricType: 'steps', value: 1200 }]);
    await expect(service.getTrend(7, 'steps', '7d')).resolves.toMatchObject({
      userId: 7,
      metricType: 'steps',
      period: '7d',
      list: [{ metricType: 'steps', value: 1200 }],
    });
  });

  it('maps latest blood pressure and heart rate status values', async () => {
    healthRecordModel.getLatestByMetricType
      .mockResolvedValueOnce({ id: 1, valueHigh: 150, valueLow: 95, measuredAt: '2026-03-12T09:00:00.000Z' })
      .mockResolvedValueOnce({ id: 2, value: '58', measuredAt: '2026-03-12T10:00:00.000Z' })
      .mockResolvedValueOnce(null);

    await expect(service.getLatestBloodPressure(7)).resolves.toMatchObject({ status: 'warning', systolic: 150, diastolic: 95 });
    await expect(service.getLatestHeartRate(7)).resolves.toMatchObject({ status: 'warning', value: 58 });
    await expect(service.getLatestHeartRate(8)).resolves.toBeNull();
  });
});
