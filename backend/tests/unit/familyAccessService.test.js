'use strict';

jest.mock('../../src/models/familyRelationModel', () => ({
  checkRelation: jest.fn(),
}));

const familyRelationModel = require('../../src/models/familyRelationModel');
const familyAccessService = require('../../src/services/familyAccessService');

describe('familyAccessService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns current user when no target user is requested', () => {
    expect(familyAccessService.resolveTargetUserId(7)).toBe(7);
  });

  it('rejects invalid target user ids', () => {
    expect(() => familyAccessService.resolveTargetUserId(7, 'abc')).toThrow('user_id must be a positive integer.');
  });

  it('allows self access without hitting the relation model', async () => {
    await expect(familyAccessService.assertAccess(7, 7)).resolves.toBeUndefined();
    expect(familyRelationModel.checkRelation).not.toHaveBeenCalled();
  });

  it('rejects family access when relation does not exist', async () => {
    familyRelationModel.checkRelation.mockResolvedValue(false);

    await expect(familyAccessService.assertAccess(7, 9)).rejects.toMatchObject({
      code: 403,
      statusCode: 403,
      message: 'Family access denied.',
    });
  });

  it('allows family access when relation exists', async () => {
    familyRelationModel.checkRelation.mockResolvedValue(true);

    await expect(familyAccessService.assertAccess(7, 9)).resolves.toBeUndefined();
    expect(familyRelationModel.checkRelation).toHaveBeenCalledWith(7, 9);
  });
});
