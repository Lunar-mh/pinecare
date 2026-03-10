'use strict';

const crypto = require('crypto');
const appointmentModel = require('../models/appointmentModel');
const medicalApiService = require('./medicalApiService');

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

function normalizeDate(dateText) {
  const value = String(dateText || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createBizError(422, 'appointmentDate 格式必须为 YYYY-MM-DD', 422);
  }
  return value;
}

function normalizeTimeSlot(value) {
  const timeSlot = String(value || '').trim();
  if (!timeSlot) {
    throw createBizError(422, 'timeSlot 不能为空', 422);
  }
  return timeSlot;
}

function normalizeDepartment(value) {
  const department = String(value || '').trim();
  if (!department) {
    throw createBizError(422, 'department 不能为空', 422);
  }
  return department;
}

/**
 * 基于(user_id, doctor_id, appointment_date, time_slot)生成幂等键
 * @param {number} userId
 * @param {number} doctorId
 * @param {string} appointmentDate
 * @param {string} timeSlot
 * @returns {string}
 */
function buildIdempotencyKey(userId, doctorId, appointmentDate, timeSlot) {
  const raw = `${userId}:${doctorId}:${appointmentDate}:${timeSlot}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function isDuplicateKeyError(err) {
  return Boolean(err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062));
}

const appointmentService = {
  buildIdempotencyKey,

  /**
   * 创建预约挂号（含幂等策略）
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async create(userId, payload = {}) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const hospitalId = normalizePositiveInt(payload.hospitalId, 'hospitalId');
    const doctorId = normalizePositiveInt(payload.doctorId, 'doctorId');
    const department = normalizeDepartment(payload.department);
    const appointmentDate = normalizeDate(payload.appointmentDate);
    const timeSlot = normalizeTimeSlot(payload.timeSlot);

    const idempotencyKey = buildIdempotencyKey(userIdNum, doctorId, appointmentDate, timeSlot);

    const existing = await appointmentModel.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return {
        duplicate: true,
        idempotencyKey,
        appointment: existing,
      };
    }

    const thirdPartyResult = await medicalApiService.createAppointment({
      userId: userIdNum,
      hospitalId,
      doctorId,
      department,
      appointmentDate,
      timeSlot,
    });

    try {
      const saved = await appointmentModel.create({
        userId: userIdNum,
        hospitalId,
        department,
        doctorId,
        appointmentDate,
        timeSlot,
        appointStatus: thirdPartyResult.appointStatus || 'confirmed',
        thirdPartyAppointId: thirdPartyResult.thirdPartyAppointId,
        idempotencyKey,
      });

      return {
        duplicate: false,
        idempotencyKey,
        appointment: saved,
      };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const duplicated = await appointmentModel.findByIdempotencyKey(idempotencyKey);
        if (duplicated) {
          return {
            duplicate: true,
            idempotencyKey,
            appointment: duplicated,
          };
        }
      }
      throw err;
    }
  },

  /**
   * 查询用户预约列表
   * @param {number} userId
   * @param {any} limit
   * @returns {Promise<Array<object>>}
   */
  async listByUser(userId, limit) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const limitNum = limit ? Number(limit) : 20;

    return appointmentModel.listByUserId(userIdNum, Number.isInteger(limitNum) ? limitNum : 20);
  },
};

module.exports = appointmentService;
