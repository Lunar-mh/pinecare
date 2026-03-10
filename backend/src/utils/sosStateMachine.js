'use strict';

const { SOS_ERROR_CODES, SOS_ERROR_MESSAGES, createSosError } = require('./errorCodes');

const SOS_STATUS = {
  TRIGGERED: 'triggered',
  CONFIRMED: 'confirmed',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
};

const ALLOWED_TRANSITIONS = {
  triggered: ['confirmed'],
  confirmed: ['resolved'],
  resolved: [],
  cancelled: [],
};

function canTransition(fromStatus, toStatus) {
  const from = String(fromStatus || '').toLowerCase();
  const to = String(toStatus || '').toLowerCase();
  const nextList = ALLOWED_TRANSITIONS[from] || [];
  return nextList.includes(to);
}

function assertTransition(fromStatus, toStatus) {
  if (!canTransition(fromStatus, toStatus)) {
    throw createSosError(
      SOS_ERROR_CODES.ILLEGAL_TRANSITION,
      `${SOS_ERROR_MESSAGES.ILLEGAL_TRANSITION}: ${fromStatus} -> ${toStatus}`,
      { fromStatus, toStatus },
      409
    );
  }
}

module.exports = {
  SOS_STATUS,
  ALLOWED_TRANSITIONS,
  canTransition,
  assertTransition,
};
