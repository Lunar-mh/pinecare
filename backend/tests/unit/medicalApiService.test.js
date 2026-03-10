'use strict';

describe('medicalApiService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function loadService({ env = {}, client = {} } = {}) {
    process.env = { ...originalEnv, ...env };

    const mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      ...client,
    };

    jest.doMock('axios', () => ({
      create: jest.fn(() => mockClient),
    }));

    // eslint-disable-next-line global-require
    const service = require('../../src/services/medicalApiService');
    return { service, mockClient };
  }

  it('returns stub hospitals when mode is stub', async () => {
    const { service, mockClient } = loadService({
      env: {
        MEDICAL_API_MODE: 'stub',
      },
    });

    const list = await service.fetchHospitals();

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('throws 503 when forced live mode is missing config', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: '',
        MEDICAL_API_KEY: '',
      },
    });

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('maps timeout error to 504 in live mode', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: {
        get: jest.fn().mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' }),
      },
    });

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
  });

  it('maps 429 to 503 in live mode', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: {
        get: jest.fn().mockRejectedValue({ response: { status: 429, data: { token: 'abc' } } }),
      },
    });

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('retries on 5xx and succeeds on next attempt', async () => {
    const get = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({ data: { hospitals: [{ id: 1, name: 'A' }] } });

    const { service, mockClient } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: { get },
    });

    const list = await service.fetchHospitals();

    expect(list).toEqual([{ id: 1, name: 'A' }]);
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  it('falls back to stub when live call fails and fallback is enabled', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
        MEDICAL_API_ALLOW_STUB_FALLBACK: 'true',
      },
      client: {
        get: jest.fn().mockRejectedValue({ response: { status: 503 } }),
      },
    });

    const list = await service.fetchHospitals();

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });
});
