'use strict';

jest.mock('../../src/services/familyAccessService', () => ({
  resolveTargetUserId: jest.fn(),
  assertAccess: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const familyAccessService = require('../../src/services/familyAccessService');
const logger = require('../../src/utils/logger');
const familyAccess = require('../../src/middleware/familyAccess');

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

describe('familyAccess middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    const res = createRes();
    const next = jest.fn();

    await familyAccess({ query: {} }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication required.');
  });

  it('resolves and stores target user id when access is allowed', async () => {
    familyAccessService.resolveTargetUserId.mockReturnValue(23);
    familyAccessService.assertAccess.mockResolvedValue(undefined);
    const req = { user: { userId: 7 }, query: { user_id: '23' } };
    const res = createRes();
    const next = jest.fn();

    await familyAccess(req, res, next);

    expect(familyAccessService.resolveTargetUserId).toHaveBeenCalledWith(7, '23');
    expect(familyAccessService.assertAccess).toHaveBeenCalledWith(7, 23);
    expect(req.targetUserId).toBe(23);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('maps coded service errors and logs them', async () => {
    const error = new Error('Family access denied.');
    error.code = 403;
    error.statusCode = 403;
    familyAccessService.resolveTargetUserId.mockReturnValue(23);
    familyAccessService.assertAccess.mockRejectedValue(error);
    const res = createRes();
    const next = jest.fn();

    await familyAccess({ user: { userId: 7 }, query: { user_id: '23' } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Family access denied.');
    expect(logger.error).toHaveBeenCalledWith(
      'familyAccess',
      'access_denied',
      expect.objectContaining({ coded: true, code: 403, message: 'Family access denied.' })
    );
  });
});
