'use strict';

jest.mock('../../src/services/medicalApiService', () => ({
  fetchHospitals: jest.fn(),
  fetchDepartments: jest.fn(),
  fetchDoctors: jest.fn(),
  fetchDoctorDetail: jest.fn(),
  getSourceTag: jest.fn(() => 'third_party_live'),
  hasLiveConfig: jest.fn(() => true),
}));

jest.mock('../../src/models/medicalDirectoryModel', () => ({
  getHospitals: jest.fn(),
  refreshHospitals: jest.fn(),
  getDepartments: jest.fn(),
  refreshDepartments: jest.fn(),
  getDoctors: jest.fn(),
  refreshDoctors: jest.fn(),
  findDoctorById: jest.fn(),
  upsertDoctor: jest.fn(),
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

    expect(data).toMatchObject({
      source: 'cache',
      fallbackUsed: false,
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
    expect(data).toMatchObject({
      source: 'third_party_live',
      fallbackUsed: false,
      list: [{ id: 11, name: 'remote hospital' }],
    });
  });

  it('falls back to curated public hospitals when live directory is unavailable', async () => {
    medicalDirectoryModel.getHospitals.mockResolvedValue([]);
    medicalApiService.fetchHospitals.mockRejectedValue(new Error('network down'));

    const data = await medicalDirectoryService.getHospitals();

    expect(data.source).toBe('public_curated_dataset');
    expect(data.fallbackUsed).toBe(true);
    expect(data.list.length).toBeGreaterThan(0);
    expect(logThirdPartyError).toHaveBeenCalled();
  });

  it('validates department query parameter', async () => {
    await expect(medicalDirectoryService.getDepartments('0')).rejects.toMatchObject({
      code: 422,
      statusCode: 422,
    });
  });

  it('falls back to curated public doctors when live lookup fails', async () => {
    medicalDirectoryModel.getDoctors.mockResolvedValue([]);
    medicalApiService.fetchDoctors.mockRejectedValue(new Error('timeout'));

    const data = await medicalDirectoryService.getDoctors({
      departmentId: 32010001,
      page: 1,
      pageSize: 10,
    });

    expect(data).toMatchObject({
      source: 'public_curated_dataset',
      fallbackUsed: true,
      total: expect.any(Number),
      page: 1,
      pageSize: 10,
    });
    expect(data.list.length).toBeGreaterThan(0);
  });

  it('falls back to curated doctor detail when live detail fails', async () => {
    medicalDirectoryModel.findDoctorById.mockResolvedValue(null);
    medicalApiService.fetchDoctorDetail.mockRejectedValue(new Error('upstream fail'));

    const data = await medicalDirectoryService.getDoctorDetail(33010001);

    expect(data).toMatchObject({
      source: 'public_curated_dataset',
      fallbackUsed: true,
      doctor: expect.objectContaining({ id: 33010001 }),
    });
    expect(medicalDirectoryModel.upsertDoctor).toHaveBeenCalled();
  });
});
