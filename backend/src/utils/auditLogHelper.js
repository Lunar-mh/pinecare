'use strict';

const AuditLogModel = require('../models/auditLog');

function mergeAuditDetails(details, context = {}) {
  const baseDetails = details && typeof details === 'object' ? details : {};
  const requestId = context.requestId || null;

  if (!requestId) {
    return baseDetails;
  }

  return {
    ...baseDetails,
    requestId,
  };
}

async function writeAuditLog({ userId = null, action, context = {}, details = null }) {
  await AuditLogModel.create({
    userId: userId || null,
    action,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    details: mergeAuditDetails(details, context),
  });
}

module.exports = {
  writeAuditLog,
};
