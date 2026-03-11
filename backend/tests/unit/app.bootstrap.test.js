'use strict';

describe('app bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('starts medication jobs outside test mode', () => {
    const appUse = jest.fn();
    const express = jest.fn(() => ({ use: appUse }));
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const startMedicationJobs = jest.fn();

    jest.doMock('express', () => express);
    jest.doMock('cors', () => cors);
    jest.doMock('../../src/routes', () => 'routes-middleware');
    jest.doMock('../../src/routes/healthRoutes', () => 'health-routes-middleware');
    jest.doMock('../../src/middleware/errorHandler', () => 'error-handler-middleware');
    jest.doMock('../../src/middleware/requestContext', () => 'request-context-middleware');
    jest.doMock('../../src/jobs', () => ({ startMedicationJobs }));

    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_MEDICATION_JOBS;

    require('../../src/app');

    expect(express).toHaveBeenCalledTimes(1);
    expect(express.json).toHaveBeenCalledWith({ limit: '10mb' });
    expect(cors).toHaveBeenCalledTimes(1);
    expect(startMedicationJobs).toHaveBeenCalledTimes(1);
    expect(appUse).toHaveBeenCalledWith('request-context-middleware');
    expect(appUse).toHaveBeenCalledWith('/health', 'health-routes-middleware');
    expect(appUse).toHaveBeenCalledWith('/api/v1', 'routes-middleware');
    expect(appUse).toHaveBeenCalledWith('/', 'routes-middleware');
    expect(appUse).toHaveBeenCalledWith('error-handler-middleware');
  });
});
