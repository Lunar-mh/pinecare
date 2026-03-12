'use strict';

const { createBizErrorFromMessage } = require('../utils/serviceError');
const familyRelationModel = require('../models/familyRelationModel');

const familyAccessService = {
  resolveTargetUserId(currentUserId, requestedUserId) {
    if (requestedUserId === undefined || requestedUserId === null || requestedUserId === '') {
      return currentUserId;
    }

    const targetUserId = Number(requestedUserId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw createBizErrorFromMessage('user_id must be a positive integer.', 400, 400);
    }

    return targetUserId;
  },

  async canAccess(caregiverId, elderId) {
    if (Number(caregiverId) === Number(elderId)) {
      return true;
    }

    return familyRelationModel.checkRelation(caregiverId, elderId);
  },

  async assertAccess(caregiverId, elderId) {
    const allowed = await this.canAccess(caregiverId, elderId);
    if (!allowed) {
      throw createBizErrorFromMessage('Family access denied.', 403, 403);
    }
  },
};

module.exports = familyAccessService;