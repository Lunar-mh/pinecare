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
    expect(data).toMatchObject({
      source: 'third_party_live',
      fallbackUsed: false,
      list: [{ reportNo: 'R-1' }],
    });
  });

  it('falls back to local cache when remote fails', async () => {
    const local = [{ reportNo: 'LOCAL-1' }];
    medicalReportModel.listByUserId.mockResolvedValue(local);
    medicalApiService.fetchMedicalReports.mockRejectedValue(new Error('remote fail'));

    const data = await medicalReportService.list(1001, {});

    expect(data).toMatchObject({
      source: 'cache',
      fallbackUsed: true,
      list: local,
    });
    expect(logThirdPartyError).toHaveBeenCalled();
  });

  it('falls back to curated competition samples when no cache exists', async () => {
    medicalReportModel.listByUserId.mockResolvedValue([]);
    medicalApiService.fetchMedicalReports.mockRejectedValue(new Error('network down'));

    const data = await medicalReportService.list(1001, { reportType: 'Lab' });

    expect(data).toMatchObject({
      source: 'competition_dataset_sample',
      fallbackUsed: true,
    });
    expect(data.list.length).toBeGreaterThan(0);
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
