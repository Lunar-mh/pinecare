'use strict';

jest.mock('../../src/services/locationService', () => ({
  upload: jest.fn(),
  getCurrent: jest.fn(),
}));

jest.mock('../../src/services/locationTrailService', () => ({
  getTrail: jest.fn(),
}));

const locationService = require('../../src/services/locationService');
const locationTrailService = require('../../src/services/locationTrailService');
const locationController = require('../../src/controllers/locationController');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

describe('locationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads current location with unified response', async () => {
    locationService.upload.mockResolvedValue({ id: 1, latitude: 30.1 });
    const res = createRes();

    await locationController.upload(
      {
        user: { userId: 12 },
        body: { latitude: 30.1, longitude: 120.2, accuracy: 15, locationType: 'gps' },
      },
      res
    );

    expect(locationService.upload).toHaveBeenCalledWith(12, {
      latitude: 30.1,
      longitude: 120.2,
      accuracy: 15,
      locationType: 'gps',
    });
    expect(res.body).toEqual({
      code: 0,
      message: 'Upload successful.',
      data: { id: 1, latitude: 30.1 },
    });
  });

  it('returns current location with unified response', async () => {
    locationService.getCurrent.mockResolvedValue({ latitude: 30.1, longitude: 120.2 });
    const res = createRes();

    await locationController.current(
      {
        user: { userId: 12 },
      },
      res
    );

    expect(locationService.getCurrent).toHaveBeenCalledWith(12);
    expect(res.body).toEqual({
      code: 0,
      message: 'Query successful.',
      data: { latitude: 30.1, longitude: 120.2 },
    });
  });

  it('maps business errors for trail query', async () => {
    const err = new Error('Trail query failed.');
    err.code = 422;
    err.statusCode = 422;
    locationTrailService.getTrail.mockRejectedValue(err);
    const res = createRes();

    await locationController.trail(
      {
        user: { userId: 12 },
        query: { startDate: '2026-03-01', endDate: '2026-03-11', limit: '50' },
      },
      res
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      code: 422,
      message: 'Trail query failed.',
      data: null,
    });
  });

  it('falls back to generic 500 for uncoded upload failures', async () => {
    locationService.upload.mockRejectedValue(new Error('Upload exploded.'));
    const res = createRes();

    await locationController.upload(
      {
        user: { userId: 12 },
        body: { latitude: 30.1, longitude: 120.2 },
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Internal server error.',
      data: null,
    });
  });
});
