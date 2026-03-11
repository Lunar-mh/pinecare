'use strict';

describe('app bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    delete process.env.SERVER_ROLE;
    delete process.env.NODE_ENV;
  });

  it('starts medication jobs only for worker role', () => {
    const appUse = jest.fn();
    const appSet = jest.fn();
    const express = jest.fn(() => ({ use: appUse, set: appSet }));
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const startMedicationJobs = jest.fn();

    jest.doMock('express', () => express);
    jest.doMock('cors', () => cors);
    jest.doMock('../../src/routes', () => 'routes-middleware');
    jest.doMock('../../src/routes/healthRoutes', () => 'health-routes-middleware');
    jest.doMock('../../src/routes/systemHealthRoutes', () => 'system-health-routes-middleware');
    jest.doMock('../../src/middleware/errorHandler', () => 'error-handler-middleware');
    jest.doMock('../../src/middleware/requestContext', () => 'request-context-middleware');
    jest.doMock('../../src/middleware/securityHeaders', () => 'security-headers-middleware');
    jest.doMock('../../src/jobs', () => ({ startMedicationJobs }));
    jest.doMock('../../src/config/http', () => ({
      buildCorsOptions: jest.fn(() => ({ origin: 'delegated' })),
      getJsonBodyLimit: jest.fn(() => '2mb'),
      getTrustProxySetting: jest.fn(() => 1),
      shouldStartMedicationJobs: jest.fn(() => true),
    }));

    process.env.NODE_ENV = 'development';
    process.env.SERVER_ROLE = 'worker';

    require('../../src/app');

    expect(express).toHaveBeenCalledTimes(1);
    expect(appSet).toHaveBeenCalledWith('trust proxy', 1);
    expect(express.json).toHaveBeenCalledWith({ limit: '2mb' });
    expect(cors).toHaveBeenCalledWith({ origin: 'delegated' });
    expect(startMedicationJobs).toHaveBeenCalledTimes(1);
    expect(appUse).toHaveBeenCalledWith('request-context-middleware');
    expect(appUse).toHaveBeenCalledWith('security-headers-middleware');
    expect(appUse).toHaveBeenCalledWith('system-health-routes-middleware');
    expect(appUse).toHaveBeenCalledWith('/health', 'health-routes-middleware');
    expect(appUse).toHaveBeenCalledWith('/api/v1', 'routes-middleware');
    expect(appUse).toHaveBeenCalledWith('/', 'routes-middleware');
    expect(appUse).toHaveBeenCalledWith('error-handler-middleware');
  });

  it('does not start medication jobs for api role', () => {
    const appUse = jest.fn();
    const appSet = jest.fn();
    const express = jest.fn(() => ({ use: appUse, set: appSet }));
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const startMedicationJobs = jest.fn();

    jest.doMock('express', () => express);
    jest.doMock('cors', () => cors);
    jest.doMock('../../src/routes', () => 'routes-middleware');
    jest.doMock('../../src/routes/healthRoutes', () => 'health-routes-middleware');
    jest.doMock('../../src/routes/systemHealthRoutes', () => 'system-health-routes-middleware');
    jest.doMock('../../src/middleware/errorHandler', () => 'error-handler-middleware');
    jest.doMock('../../src/middleware/requestContext', () => 'request-context-middleware');
    jest.doMock('../../src/middleware/securityHeaders', () => 'security-headers-middleware');
    jest.doMock('../../src/jobs', () => ({ startMedicationJobs }));
    jest.doMock('../../src/config/http', () => ({
      buildCorsOptions: jest.fn(() => ({ origin: 'delegated' })),
      getJsonBodyLimit: jest.fn(() => '1mb'),
      getTrustProxySetting: jest.fn(() => false),
      shouldStartMedicationJobs: jest.fn(() => false),
    }));

    process.env.NODE_ENV = 'development';
    process.env.SERVER_ROLE = 'api';

    require('../../src/app');

    expect(startMedicationJobs).not.toHaveBeenCalled();
  });
});
