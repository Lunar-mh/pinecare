'use strict';

jest.mock('../../src/models/healthRecordModel', () => ({
  insertManual: jest.fn(),
}));
jest.mock('../../src/utils/healthAlert', () => ({
  evaluateRecord: jest.fn(),
}));

const healthRecordModel = require('../../src/models/healthRecordModel');
const { evaluateRecord } = require('../../src/utils/healthAlert');
const service = require('../../src/services/healthManualService');

describe('healthManualService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    healthRecordModel.insertManual.mockImplementation(async (payload) => ({ id: 1, ...payload }));
    evaluateRecord.mockReturnValue({ isAlert: false, reasons: [] });
  });

  it('validates metric type and value', async () => {
    await expect(service.createManualRecord(7, { value: '80' })).rejects.toMatchObject({ code: 400 });
    await expect(service.createManualRecord(7, { metricType: 'invalid', value: '80' })).rejects.toMatchObject({ code: 400 });
    await expect(service.createManualRecord(7, { metricType: 'heart_rate', value: '' })).rejects.toMatchObject({ code: 400 });
  });

  it('creates blood pressure records with parsed highs and lows', async () => {
    const result = await service.createManualRecord(7, {
      metricType: 'blood_pressure',
      value: '138/88',
      deviceId: 12,
    });

    expect(healthRecordModel.insertManual).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        metricType: 'blood_pressure',
        valueHigh: 138,
        valueLow: 88,
        deviceId: 12,
      })
    );
    expect(result.alert).toEqual({ isAlert: false, reasons: [] });
  });

  it('returns alert metadata when evaluator reports risk', async () => {
    evaluateRecord.mockReturnValueOnce({ isAlert: true, reasons: ['high blood pressure'] });

    const result = await service.createManualRecord(7, {
      metric_type: 'heart_rate',
      value: '120',
    });

    expect(result.alert).toEqual({
      isAlert: true,
      reasons: ['high blood pressure'],
    });
  });
});
