'use strict';

const {
  logThirdPartyError,
  clearRecentThirdPartyErrors,
} = require('../../src/utils/thirdParty');
const {
  recordProviderSuccess,
  getProviderRuntime,
  mergeProviderRuntime,
  clearProviderRuntimeStatuses,
} = require('../../src/utils/providerRuntime');

describe('providerRuntime', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    clearRecentThirdPartyErrors();
    clearProviderRuntimeStatuses();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks the latest provider success and merges it into capability payloads', () => {
    recordProviderSuccess('medical-api', {
      operation: 'create_appointment',
      mode: 'live',
      requestId: 'req-1',
    });

    expect(getProviderRuntime('medical-api')).toMatchObject({
      provider: 'medical-api',
      successCount: 1,
      lastSuccess: {
        operation: 'create_appointment',
        mode: 'live',
        requestId: 'req-1',
      },
      lastOutcome: 'success',
    });

    expect(
      mergeProviderRuntime('medical-api', {
        effectiveMode: 'live',
      })
    ).toMatchObject({
      provider: 'medical-api',
      effectiveMode: 'live',
      successCount: 1,
      lastOutcome: 'success',
    });
  });

  it('surfaces the latest sanitized error from the shared third-party error buffer', () => {
    logThirdPartyError(
      'wechat-notify',
      {
        code: 'ECONNABORTED',
        message: 'Bearer abc timeout',
        response: { status: 504, data: { token: 'raw-token' } },
      },
      { openId: 'openid-001' }
    );

    expect(getProviderRuntime('wechat-notify')).toMatchObject({
      provider: 'wechat-notify',
      errorCount: 1,
      lastError: {
        code: 'ECONNABORTED',
        status: 504,
      },
    });
    expect(getProviderRuntime('wechat-notify').lastError.message).not.toContain('abc');
  });
});
