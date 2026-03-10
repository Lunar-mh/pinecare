'use strict';

const crypto = require('crypto');
const appointmentModel = require('../models/appointmentModel');
const medicalApiService = require('./medicalApiService');

const CANCELLABLE_STATUS = new Set(['pending', 'confirmed']);
const ALLOWED_STATUS_FILTER = new Set(['pending', 'confirmed', 'completed', 'cancelled']);

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

function normalizeDate(dateText) {
  const value = String(dateText || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createBizError(422, 'appointmentDate must use YYYY-MM-DD format.', 422);
  }
  return value;
}

function normalizeTimeSlot(value) {
  const timeSlot = String(value || '').trim();
  if (!timeSlot) {
    throw createBizError(422, 'timeSlot is required.', 422);
  }
  return timeSlot;
}

function normalizeDepartment(value) {
  const department = String(value || '').trim();
  if (!department) {
    throw createBizError(422, 'department is required.', 422);
  }
  return department;
}

function normalizeStatus(status) {
  if (status === undefined || status === null || status === '') {
    return null;
  }

  const value = String(status).trim().toLowerCase();
  if (!ALLOWED_STATUS_FILTER.has(value)) {
    throw createBizError(422, 'status must be pending/confirmed/completed/cancelled.', 422);
  }
  return value;
}

function normalizePage(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function buildIdempotencyKey(userId, doctorId, appointmentDate, timeSlot) {
  const raw = `${userId}:${doctorId}:${appointmentDate}:${timeSlot}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function isDuplicateKeyError(err) {
  return Boolean(err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062));
}

const appointmentService = {
  buildIdempotencyKey,

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

  async listByUser(userId, query = {}) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const page = normalizePage(query.page, 1);
    const pageSize = Math.min(normalizePage(query.pageSize, 10), 100);
    const status = normalizeStatus(query.status);

    return appointmentModel.listByUserId(userIdNum, {
      status,
      page,
      pageSize,
    });
  },

  async cancel(userId, appointmentId) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const appointmentIdNum = normalizePositiveInt(appointmentId, 'appointmentId');

    const appointment = await appointmentModel.findByIdAndUserId(appointmentIdNum, userIdNum);
    if (!appointment) {
      throw createBizError(404, 'Appointment not found.', 404);
    }

    if (!CANCELLABLE_STATUS.has(String(appointment.appointStatus).toLowerCase())) {
      throw createBizError(409, 'Appointment is not cancellable.', 409);
    }

    await appointmentModel.updateStatus(appointmentIdNum, 'cancelled');
    const latest = await appointmentModel.findByIdAndUserId(appointmentIdNum, userIdNum);

    return {
      appointment: latest,
    };
  },
};

module.exports = appointmentService;
