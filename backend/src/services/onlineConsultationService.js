'use strict';

const onlineConsultationModel = require('../models/onlineConsultationModel');
const medicalApiService = require('./medicalApiService');
const { createMedicalMeta } = require('./medicalMeta');

const ALLOWED_CONSULT_STATUS = ['pending', 'active', 'completed', 'cancelled'];

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function normalizePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(422, `${fieldName} must be a positive integer.`, 422);
  }
  return parsed;
}

function normalizeDepartment(value) {
  const department = String(value || '').trim();
  if (!department) {
    throw createBizError(422, 'department is required.', 422);
  }
  return department;
}

function validateStatusTransition(fromStatus, toStatus) {
  if (!ALLOWED_CONSULT_STATUS.includes(toStatus)) {
    throw createBizError(422, 'Invalid consultStatus.', 422);
  }

  const transitions = {
    pending: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const allowed = transitions[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw createBizError(
      409,
      `Invalid consult status transition: ${fromStatus} -> ${toStatus}.`,
      409
    );
  }
}

function withMeta(operation, payload, options = {}) {
  return {
    ...createMedicalMeta(medicalApiService, operation, options),
    ...payload,
  };
}

const onlineConsultationService = {
  async start(userId, payload = {}) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const doctorId = normalizePositiveInt(payload.doctorId, 'doctorId');
    const department = normalizeDepartment(payload.department);

    const session = await medicalApiService.createConsultSession({
      userId: userIdNum,
      doctorId,
      department,
    });

    const saved = await onlineConsultationModel.create({
      userId: userIdNum,
      doctorId,
      department,
      consultStatus: session.consultStatus || 'active',
      sessionUrl: session.sessionUrl,
      thirdPartySessionId: session.thirdPartySessionId,
      startedAt: session.startedAt || new Date(),
    });

    return withMeta(
      'medical.consult.start',
      { consultation: saved },
      {
        source:
          typeof medicalApiService.getSourceTag === 'function'
            ? medicalApiService.getSourceTag()
            : 'third_party_stub',
        reason: 'consult_session_started',
      }
    );
  },

  async updateStatus(userId, consultationId, consultStatus) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const consultationIdNum = normalizePositiveInt(consultationId, 'consultationId');
    const targetStatus = String(consultStatus || '').trim();

    const existing = await onlineConsultationModel.findById(consultationIdNum);
    if (!existing || Number(existing.userId) !== userIdNum) {
      throw createBizError(404, 'Consultation record not found.', 404);
    }

    validateStatusTransition(existing.consultStatus, targetStatus);

    const success = await onlineConsultationModel.updateStatus(consultationIdNum, targetStatus, {
      endedAt: targetStatus === 'completed' || targetStatus === 'cancelled' ? new Date() : null,
    });

    if (!success) {
      throw createBizError(500, 'Failed to update consultation status.', 500);
    }

    const consultation = await onlineConsultationModel.findById(consultationIdNum);
    return withMeta(
      'medical.consult.update_status',
      { consultation },
      { source: 'local', reason: 'consultation_status_updated' }
    );
  },

  async listByUser(userId, limit) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const limitNum = limit ? Number(limit) : 20;
    const list = await onlineConsultationModel.listByUserId(
      userIdNum,
      Number.isInteger(limitNum) ? limitNum : 20
    );

    return withMeta(
      'medical.consult.list',
      { list },
      { source: 'local', reason: 'consultation_local_list' }
    );
  },
};

module.exports = onlineConsultationService;
