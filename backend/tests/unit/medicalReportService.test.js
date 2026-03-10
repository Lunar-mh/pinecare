'use strict';

jest.mock('../../src/services/medicalApiService', () => ({
  fetchMedicalReports: jest.fn(),
  getSourceTag: jest.fn(() => 'third_party_live'),
}));

jest.mock('../../src/models/medicalReportModel', () => ({
  listByUserId: jest.fn(),
  batchUpsert: jest.fn(),
}));

jest.mock('../../src/utils/thirdParty', () => ({
  logThirdPartyError: jest.fn(),
}));

const medicalApiService = require('../../src/services/medicalApiService');
const medicalReportModel = require('../../src/models/medicalReportModel');
const { logThirdPartyError } = require('../../src/utils/thirdParty');
const medicalReportService = require('../../src/services/medicalReportService');

describe('medicalReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates userId', async () => {
    await expect(medicalReportService.list('x')).rejects.toMatchObject({
      code: 422,
      statusCode: 422,
    });
  });

  it('syncs remote reports into local model', async () => {
    medicalReportModel.listByUserId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ reportNo: 'R-1' }]);
    medicalApiService.fetchMedicalReports.mockResolvedValue([{ reportNo: 'R-1' }]);

    const data = await medicalReportService.list(1001, { reportType: 'Lab' });

    expect(medicalApiService.fetchMedicalReports).toHaveBeenCalledWith(1001, {
      reportType: 'Lab',
      startDate: null,
      endDate: null,
    });
    expect(medicalReportModel.batchUpsert).toHaveBeenCalledWith(1001, [{ reportNo: 'R-1' }]);
    expect(data).toEqual({
      source: 'third_party_live',
      list: [{ reportNo: 'R-1' }],
    });
  });

  it('falls back to local cache when remote fails', async () => {
    const local = [{ reportNo: 'LOCAL-1' }];
    medicalReportModel.listByUserId.mockResolvedValue(local);
    medicalApiService.fetchMedicalReports.mockRejectedValue(new Error('remote fail'));

    const data = await medicalReportService.list(1001, {});

    expect(data).toEqual({
      source: 'cache',
      list: local,
    });
    expect(logThirdPartyError).toHaveBeenCalled();
  });

  it('rethrows coded upstream errors when no cache exists', async () => {
    medicalReportModel.listByUserId.mockResolvedValue([]);
    const upstream = new Error('timeout');
    upstream.code = 504;
    upstream.statusCode = 504;
    medicalApiService.fetchMedicalReports.mockRejectedValue(upstream);

    await expect(medicalReportService.list(1001, {})).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
  });

  it('wraps unknown errors as 503 when no cache exists', async () => {
    medicalReportModel.listByUserId.mockResolvedValue([]);
    medicalApiService.fetchMedicalReports.mockRejectedValue(new Error('network down'));

    await expect(medicalReportService.list(1001, {})).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('validates filter date format', async () => {
    await expect(
      medicalReportService.list(1001, {
        startDate: '2026/01/01',
      })
    ).rejects.toMatchObject({
      code: 422,
      statusCode: 422,
    });
  });
});
