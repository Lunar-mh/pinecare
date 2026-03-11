'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/healthRecordModel');
  return { model, query: db.query };
};

describe('healthRecordModel', () => {
  it('maps today records and trend data', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ id: 1, user_id: 7, metric_type: 'heart_rate', value: '70', value_high: null, value_low: null, source: 'device', device_id: 'd1', measured_at: 'm', synced_at: 's', created_at: 'c' }]])
      .mockResolvedValueOnce([[{ id: 2, user_id: 7, metric_type: 'blood_pressure', value: '120/80', value_high: '120', value_low: '80', source: 'device', device_id: 'd2', measured_at: 'm2', synced_at: 's2', created_at: 'c2' }]]);

    await expect(model.getTodayRecords(7)).resolves.toEqual([
      {
        id: 1,
        userId: 7,
        metricType: 'heart_rate',
        value: '70',
        valueHigh: null,
        valueLow: null,
        source: 'device',
        deviceId: 'd1',
        measuredAt: 'm',
        syncedAt: 's',
        createdAt: 'c',
      },
    ]);

    await expect(model.getTrendData(7, 'blood_pressure', '30d')).resolves.toHaveLength(1);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INTERVAL ? DAY'),
      [7, 'blood_pressure', 30]
    );
  });

  it('batch inserts records and defaults affected rows', async () => {
    const { model, query } = loadModel();
    await expect(model.batchInsert([])).resolves.toBe(0);

    query.mockResolvedValueOnce([{ affectedRows: 2 }]);
    await expect(
      model.batchInsert([
        { userId: 1, metricType: 'heart_rate', value: 70 },
        { userId: 1, metricType: 'blood_pressure', value: '120/80', valueHigh: 120, valueLow: 80 },
      ])
    ).resolves.toBe(2);
  });

  it('inserts manual records and reads latest metric records', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([{ insertId: 9 }]);

    const created = await model.insertManual({
      userId: 7,
      metricType: 'blood_sugar',
      value: 6.1,
      deviceId: 'manual-1',
      measuredAt: '2026-03-11 10:00:00',
      syncedAt: '2026-03-11 10:00:05',
    });

    expect(created).toMatchObject({
      id: 9,
      userId: 7,
      metricType: 'blood_sugar',
      source: 'manual',
    });

    query.mockResolvedValueOnce([[]]);
    await expect(model.getLatestByMetricType(7, 'blood_sugar')).resolves.toBeNull();

    query.mockResolvedValueOnce([[{ id: 10, user_id: 7, metric_type: 'blood_sugar', value: '6.1', value_high: null, value_low: null, source: 'manual', device_id: 'manual-1', measured_at: 'm', synced_at: 's', created_at: 'c' }]]);
    await expect(model.getLatestByMetricType(7, 'blood_sugar')).resolves.toMatchObject({
      id: 10,
      metricType: 'blood_sugar',
    });
  });
});
