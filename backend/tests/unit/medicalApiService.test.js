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
    jest.resetModules();
    process.env = { ...originalEnv, ...env };

    const mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      ...client,
    };

    jest.doMock('axios', () => ({
      create: jest.fn(() => mockClient),
    }));

    const mockAuditLog = {
      create: jest.fn().mockResolvedValue(1),
    };
    jest.doMock('../../src/models/auditLog', () => mockAuditLog);

    // eslint-disable-next-line global-require
    const service = require('../../src/services/medicalApiService');
    return { service, mockClient, mockAuditLog };
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
    const { service, mockAuditLog } = loadService({
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
    expect(mockAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'medical.upstream.fallback',
      })
    );
  });

  it('cancels appointment through live endpoint', async () => {
    const post = jest
      .fn()
      .mockResolvedValue({ data: { appointStatus: 'cancelled', cancelStatus: 'ok' } });

    const { service, mockClient } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: { post },
    });

    const result = await service.cancelAppointment({
      appointmentId: 99,
      thirdPartyAppointId: 'tp-99',
      requestId: 'req-medical-99',
    });

    expect(result.appointStatus).toBe('cancelled');
    expect(mockClient.post).toHaveBeenCalledWith(
      '/appointments/tp-99/cancel',
      {
        reason: 'user_cancelled',
      },
      {
        headers: {
          'X-Request-Id': 'req-medical-99',
        },
      }
    );
  });

  it('cancel appointment throws 422 when target id missing in live mode', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
    });

    await expect(service.cancelAppointment({})).rejects.toMatchObject({
      code: 422,
      statusCode: 422,
    });
  });

  it('supports x-api-key auth mode for live client', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
        MEDICAL_API_AUTH_MODE: 'x-api-key',
      },
      client: {
        get: jest.fn().mockResolvedValue({ data: { hospitals: [{ id: 1, name: 'A' }] } }),
      },
    });

    await service.fetchHospitals();

    // eslint-disable-next-line global-require
    const axios = require('axios');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-API-Key': 'test-key',
        }),
      })
    );
  });

  it('opens circuit breaker after repeated retryable failures', async () => {
    const get = jest.fn().mockRejectedValue({ response: { status: 503 } });

    const { service, mockAuditLog } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
        MEDICAL_API_CIRCUIT_BREAKER_THRESHOLD: '2',
      },
      client: { get },
    });

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });

    expect(mockAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'medical.upstream.failure',
      })
    );

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
      message: 'Medical API circuit breaker is open.',
    });
  });

  it('reports missing config and blocks stub mode in production live', async () => {
    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'stub',
        MEDICAL_API_BASE_URL: '',
        MEDICAL_API_KEY: '',
        PRODUCTION_LIVE: '1',
      },
    });

    expect(service.getCapabilityReport()).toEqual(
      expect.objectContaining({
        source: 'third_party_stub',
        mode: 'stub',
        effectiveMode: 'stub',
        fallbackAllowed: false,
        missingConfig: ['MEDICAL_API_BASE_URL', 'MEDICAL_API_KEY'],
        runtimeMode: 'PRODUCTION_LIVE',
      })
    );

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
      message: 'Medical API stub mode is disabled in PRODUCTION_LIVE mode.',
    });
  });

  it('fetches departments and doctors from live responses', async () => {
    const get = jest
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 2001, hospitalId: 8, name: 'Cardiology' }] })
      .mockResolvedValueOnce({ data: { doctors: [{ id: 3001, departmentId: 9, name: 'Dr. Li' }] } });

    const { service, mockClient } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: { get },
    });

    await expect(service.fetchDepartments(8)).resolves.toEqual([
      { id: 2001, hospitalId: 8, name: 'Cardiology' },
    ]);
    await expect(service.fetchDoctors(9)).resolves.toEqual([
      { id: 3001, departmentId: 9, name: 'Dr. Li' },
    ]);
    expect(mockClient.get).toHaveBeenNthCalledWith(1, '/hospitals/8/departments');
    expect(mockClient.get).toHaveBeenNthCalledWith(2, '/departments/9/doctors');
  });

  it('handles doctor detail and empty live list responses', async () => {
    let loaded = loadService({
      env: {
        MEDICAL_API_MODE: 'stub',
      },
    });
    await expect(loaded.service.fetchDoctorDetail(9999)).resolves.toBeNull();

    loaded = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: {
        get: jest.fn().mockResolvedValue({ data: [] }),
      },
    });
    await expect(loaded.service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
      message: 'Empty hospitals response.',
    });

    loaded = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: {
        get: jest.fn().mockResolvedValue({ data: {} }),
      },
    });
    await expect(loaded.service.fetchDoctorDetail(1)).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
      message: 'Doctor not found.',
    });
  });

  it('creates consult sessions and appointments with request headers', async () => {
    const post = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          thirdPartySessionId: 'consult-1',
          sessionUrl: 'https://consult.example.com/session/consult-1',
          consultStatus: 'active',
          startedAt: '2026-03-11T09:00:00.000Z',
          doctorId: 7,
        },
      })
      .mockResolvedValueOnce({
        data: {
          thirdPartyAppointId: 'appoint-1',
          appointStatus: 'confirmed',
          hospitalId: 8,
          doctorId: 7,
        },
      });

    const { service, mockClient } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: { post },
    });

    const consult = await service.createConsultSession({ doctorId: 7, requestId: 'req-consult-1' });
    const appointment = await service.createAppointment({
      hospitalId: 8,
      doctorId: 7,
      requestId: 'req-appoint-1',
    });

    expect(consult).toEqual(
      expect.objectContaining({
        thirdPartySessionId: 'consult-1',
        doctorId: 7,
      })
    );
    expect(appointment).toEqual(
      expect.objectContaining({
        thirdPartyAppointId: 'appoint-1',
        hospitalId: 8,
        doctorId: 7,
      })
    );
    expect(mockClient.post).toHaveBeenNthCalledWith(
      1,
      '/consult/sessions',
      { doctorId: 7, requestId: 'req-consult-1' },
      { headers: { 'X-Request-Id': 'req-consult-1' } }
    );
    expect(mockClient.post).toHaveBeenNthCalledWith(
      2,
      '/appointments',
      { hospitalId: 8, doctorId: 7, requestId: 'req-appoint-1' },
      { headers: { 'X-Request-Id': 'req-appoint-1' } }
    );
  });

  it('returns stub reports and maps live medical reports', async () => {
    let loaded = loadService({
      env: {
        MEDICAL_API_MODE: 'stub',
      },
    });

    const stubReports = await loaded.service.fetchMedicalReports(5, { reportType: 'Lab' });
    expect(stubReports).toHaveLength(1);
    expect(stubReports[0].reportType).toBe('Lab');

    const get = jest.fn().mockResolvedValue({
      data: {
        reports: [
          {
            reportNo: 'RPT-5-003',
            reportType: 'Lab',
            reportDate: '2026-03-11',
            reportUrl: 'https://report.example.com/rpt-003.pdf',
            reportData: { item: 'Glucose' },
            syncStatus: 'synced',
          },
        ],
      },
    });
    loaded = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
      },
      client: { get },
    });

    const liveReports = await loaded.service.fetchMedicalReports(5, {
      reportType: 'Lab',
      startDate: '2026-03-01',
      endDate: '2026-03-11',
      requestId: 'req-report-1',
    });

    expect(liveReports).toEqual([
      {
        reportNo: 'RPT-5-003',
        reportType: 'Lab',
        reportDate: '2026-03-11',
        reportUrl: 'https://report.example.com/rpt-003.pdf',
        reportData: { item: 'Glucose' },
        syncStatus: 'synced',
      },
    ]);
    expect(loaded.mockClient.get).toHaveBeenCalledWith('/reports', {
      params: {
        userId: 5,
        reportType: 'Lab',
        startDate: '2026-03-01',
        endDate: '2026-03-11',
      },
      headers: {
        'X-Request-Id': 'req-report-1',
      },
    });
  });

  it('resets the circuit breaker after cooldown', async () => {
    const get = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: { hospitals: [{ id: 2, name: 'Recovered' }] } });

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);

    const { service } = loadService({
      env: {
        MEDICAL_API_MODE: 'live',
        MEDICAL_API_BASE_URL: 'https://medical-api.example.com',
        MEDICAL_API_KEY: 'test-key',
        MEDICAL_API_CIRCUIT_BREAKER_THRESHOLD: '1',
        MEDICAL_API_CIRCUIT_BREAKER_COOLDOWN_MS: '1000',
        MEDICAL_API_MAX_RETRY: '0',
      },
      client: { get },
    });

    await expect(service.fetchHospitals()).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
    await expect(service.fetchHospitals()).rejects.toMatchObject({
      message: 'Medical API circuit breaker is open.',
    });

    nowSpy.mockReturnValue(2200);
    await expect(service.fetchHospitals()).resolves.toEqual([{ id: 2, name: 'Recovered' }]);
  });
});

