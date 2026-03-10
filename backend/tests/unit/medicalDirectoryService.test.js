'use strict';

jest.mock('../../src/services/medicalApiService', () => ({
  fetchHospitals: jest.fn(),
  fetchDepartments: jest.fn(),
  fetchDoctors: jest.fn(),
  getSourceTag: jest.fn(() => 'third_party_live'),
}));

jest.mock('../../src/models/medicalDirectoryModel', () => ({
  getHospitals: jest.fn(),
  refreshHospitals: jest.fn(),
  getDepartments: jest.fn(),
  refreshDepartments: jest.fn(),
  getDoctors: jest.fn(),
  refreshDoctors: jest.fn(),
}));

jest.mock('../../src/utils/thirdParty', () => ({
  logThirdPartyError: jest.fn(),
}));

const medicalApiService = require('../../src/services/medicalApiService');
const medicalDirectoryModel = require('../../src/models/medicalDirectoryModel');
const { logThirdPartyError } = require('../../src/utils/thirdParty');
const medicalDirectoryService = require('../../src/services/medicalDirectoryService');

describe('medicalDirectoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached hospitals when cache is available', async () => {
    medicalDirectoryModel.getHospitals.mockResolvedValue([{ id: 1, name: 'cached hospital' }]);

    const data = await medicalDirectoryService.getHospitals();

    expect(data).toEqual({
      source: 'cache',
      list: [{ id: 1, name: 'cached hospital' }],
    });
    expect(medicalApiService.fetchHospitals).not.toHaveBeenCalled();
  });

  it('refreshes hospitals from remote when cache is empty', async () => {
    medicalDirectoryModel.getHospitals.mockResolvedValue([]);
    medicalApiService.fetchHospitals.mockResolvedValue([{ id: 11, name: 'remote hospital' }]);

    const data = await medicalDirectoryService.getHospitals();

    expect(medicalDirectoryModel.refreshHospitals).toHaveBeenCalledWith([
      { id: 11, name: 'remote hospital' },
    ]);
    expect(data).toEqual({
      source: 'third_party_live',
      list: [{ id: 11, name: 'remote hospital' }],
    });
  });

  it('validates department query parameter', async () => {
    await expect(medicalDirectoryService.getDepartments('0')).rejects.toMatchObject({
      code: 422,
      statusCode: 422,
    });
  });

  it('rethrows coded upstream error for doctors lookup', async () => {
    medicalDirectoryModel.getDoctors.mockResolvedValue([]);
    const upstreamError = new Error('timeout');
    upstreamError.code = 504;
    upstreamError.statusCode = 504;
    medicalApiService.fetchDoctors.mockRejectedValue(upstreamError);

    await expect(medicalDirectoryService.getDoctors(99)).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
    expect(logThirdPartyError).toHaveBeenCalledWith(
      'medical-directory',
      upstreamError,
      expect.objectContaining({ operation: 'getDoctors', departmentId: 99 })
    );
  });

  it('wraps unknown remote errors as 503', async () => {
    medicalDirectoryModel.getDepartments.mockResolvedValue([]);
    medicalApiService.fetchDepartments.mockRejectedValue(new Error('network down'));

    await expect(medicalDirectoryService.getDepartments(12)).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });
});
