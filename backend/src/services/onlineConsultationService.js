'use strict';

const onlineConsultationModel = require('../models/onlineConsultationModel');
const medicalApiService = require('./medicalApiService');

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
    throw createBizError(422, `${fieldName} 必须为正整数`, 422);
  }
  return parsed;
}

function normalizeDepartment(value) {
  const department = String(value || '').trim();
  if (!department) {
    throw createBizError(422, 'department 不能为空', 422);
  }
  return department;
}

function validateStatusTransition(fromStatus, toStatus) {
  if (!ALLOWED_CONSULT_STATUS.includes(toStatus)) {
    throw createBizError(422, 'consultStatus 不合法', 422);
  }

  const transitions = {
    pending: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const allowed = transitions[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw createBizError(409, `问诊状态不允许从 ${fromStatus} 变更为 ${toStatus}`, 409);
  }
}

const onlineConsultationService = {
  /**
   * 发起在线问诊
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
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

    return {
      consultation: saved,
      source: 'third_party_stub',
    };
  },

  /**
   * 更新问诊状态
   * @param {number} userId
   * @param {any} consultationId
   * @param {string} consultStatus
   * @returns {Promise<object>}
   */
  async updateStatus(userId, consultationId, consultStatus) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const consultationIdNum = normalizePositiveInt(consultationId, 'consultationId');
    const targetStatus = String(consultStatus || '').trim();

    const existing = await onlineConsultationModel.findById(consultationIdNum);
    if (!existing || Number(existing.userId) !== userIdNum) {
      throw createBizError(404, '问诊记录不存在', 404);
    }

    validateStatusTransition(existing.consultStatus, targetStatus);

    const success = await onlineConsultationModel.updateStatus(consultationIdNum, targetStatus, {
      endedAt: targetStatus === 'completed' || targetStatus === 'cancelled' ? new Date() : null,
    });

    if (!success) {
      throw createBizError(500, '问诊状态更新失败', 500);
    }

    const updated = await onlineConsultationModel.findById(consultationIdNum);
    return updated;
  },

  /**
   * 查询用户问诊记录
   * @param {number} userId
   * @param {any} limit
   * @returns {Promise<Array<object>>}
   */
  async listByUser(userId, limit) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const limitNum = limit ? Number(limit) : 20;

    return onlineConsultationModel.listByUserId(userIdNum, Number.isInteger(limitNum) ? limitNum : 20);
  },
};

module.exports = onlineConsultationService;
