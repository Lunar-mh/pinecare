'use strict';

const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const UserModel = require('../models/user');
const EmergencyContactModel = require('../models/emergencyContact');
const FamilyBindingModel = require('../models/familyBinding');
const smsService = require('./smsService');
const { createBusinessError } = require('../utils/serviceError');
const { writeAuditLog: writeAuditEntry } = require('../utils/auditLogHelper');

const MAX_EMERGENCY_CONTACTS = 5;
const BINDING_QR_TTL_MS = 15 * 60 * 1000;
const MAX_REAL_NAME_LENGTH = 20;
const MAX_CHRONIC_DISEASES = 20;
const MAX_CHRONIC_DISEASE_LENGTH = 30;

async function writeAuditLog(userId, action, context = {}, details = null) {
  await writeAuditEntry({ userId, action, context, details });
}

function assertOptionalBoolean(value, fieldName = 'is_primary') {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'boolean') {
    throw createBusinessError(400, `${fieldName} must be boolean.`, null, 400);
  }
}

function normalizeProfilePayload(payload = {}) {
  const normalized = {};

  if (payload.real_name !== undefined) {
    if (payload.real_name !== null && typeof payload.real_name !== 'string') {
      throw createBusinessError(400, 'real_name must be a string.', null, 400);
    }

    const name = String(payload.real_name || '').trim();
    if (name.length > MAX_REAL_NAME_LENGTH) {
      throw createBusinessError(
        400,
        `real_name must be at most ${MAX_REAL_NAME_LENGTH} characters.`,
        null,
        400
      );
    }
    normalized.real_name = name || null;
  }

  if (payload.age !== undefined) {
    const age = Number(payload.age);
    if (!Number.isInteger(age) || age < 0 || age > 125) {
      throw createBusinessError(400, 'age must be between 0 and 125.', null, 400);
    }
    normalized.age = age;
  }

  if (payload.gender !== undefined) {
    const gender = String(payload.gender || '').trim();
    if (!['male', 'female', 'unknown'].includes(gender)) {
      throw createBusinessError(400, 'gender must be one of male, female, or unknown.', null, 400);
    }
    normalized.gender = gender;
  }

  if (payload.chronic_diseases !== undefined) {
    if (!Array.isArray(payload.chronic_diseases)) {
      throw createBusinessError(400, 'chronic_diseases must be an array.', null, 400);
    }
    if (payload.chronic_diseases.length > MAX_CHRONIC_DISEASES) {
      throw createBusinessError(
        400,
        `chronic_diseases can include up to ${MAX_CHRONIC_DISEASES} items.`,
        null,
        400
      );
    }

    normalized.chronic_diseases = payload.chronic_diseases.map((item) => {
      if (typeof item !== 'string') {
        throw createBusinessError(
          400,
          'Each chronic_disease must be a non-empty string up to 30 characters.',
          null,
          400
        );
      }

      const value = item.trim();
      if (!value || value.length > MAX_CHRONIC_DISEASE_LENGTH) {
        throw createBusinessError(
          400,
          'Each chronic_disease must be a non-empty string up to 30 characters.',
          null,
          400
        );
      }

      return value;
    });
  }

  return normalized;
}

async function assertUserAvailable(userId) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw createBusinessError(404, 'User not found.', null, 404);
  }
  if (user.account_status === 'deleted') {
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }
  return user;
}

async function getProfile(userId) {
  const profile = await UserModel.getProfileById(userId);
  if (!profile) {
    throw createBusinessError(404, 'User not found.', null, 404);
  }
  if (profile.account_status === 'deleted') {
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }
  return profile;
}

async function updateProfile(userId, payload, context = {}) {
  await assertUserAvailable(userId);

  const normalizedPayload = normalizeProfilePayload(payload);
  const profile = await UserModel.updateProfile(userId, normalizedPayload);
  await writeAuditLog(userId, 'profile_update', context, {
    fields: Object.keys(normalizedPayload),
  });

  return profile;
}

async function listEmergencyContacts(userId) {
  await assertUserAvailable(userId);
  return EmergencyContactModel.listByUserId(userId);
}

async function createEmergencyContact(userId, payload, context = {}) {
  await assertUserAvailable(userId);
  assertOptionalBoolean(payload.is_primary);

  const total = await EmergencyContactModel.countByUserId(userId);
  if (total >= MAX_EMERGENCY_CONTACTS) {
    throw createBusinessError(
      400,
      `Emergency contacts exceed max limit (${MAX_EMERGENCY_CONTACTS}).`,
      null,
      400
    );
  }

  const created = await EmergencyContactModel.create(userId, {
    name: payload.name,
    phone: payload.phone,
    relationship: payload.relationship,
    isPrimary: payload.is_primary === true,
  });

  await writeAuditLog(userId, 'contact_manage', context, {
    action: 'create',
    contact_id: created.id,
  });

  return created;
}

async function updateEmergencyContact(userId, contactId, payload, context = {}) {
  await assertUserAvailable(userId);
  assertOptionalBoolean(payload.is_primary);

  const existing = await EmergencyContactModel.findByIdAndUserId(contactId, userId);
  if (!existing) {
    throw createBusinessError(404, 'Emergency contact not found.', null, 404);
  }

  const updated = await EmergencyContactModel.updateByIdAndUserId(contactId, userId, {
    name: payload.name,
    phone: payload.phone,
    relationship: payload.relationship,
  });

  if (!updated) {
    throw createBusinessError(500, 'Failed to update emergency contact.', null, 500);
  }

  if (payload.is_primary === true) {
    const primary = await EmergencyContactModel.setPrimaryByIdAndUserId(contactId, userId);
    if (!primary) {
      throw createBusinessError(500, 'Failed to update primary contact.', null, 500);
    }
  }

  const latest = await EmergencyContactModel.findByIdAndUserId(contactId, userId);

  await writeAuditLog(userId, 'contact_manage', context, {
    action: 'update',
    contact_id: contactId,
  });

  return latest;
}

async function setPrimaryContact(userId, contactId, context = {}) {
  await assertUserAvailable(userId);

  const updated = await EmergencyContactModel.setPrimaryByIdAndUserId(contactId, userId);
  if (!updated) {
    throw createBusinessError(404, 'Emergency contact not found.', null, 404);
  }

  await writeAuditLog(userId, 'contact_manage', context, {
    action: 'set_primary',
    contact_id: contactId,
  });

  return updated;
}

async function deleteEmergencyContact(userId, contactId, context = {}) {
  await assertUserAvailable(userId);

  const affectedRows = await EmergencyContactModel.deleteByIdAndUserId(contactId, userId);
  if (!affectedRows) {
    throw createBusinessError(404, 'Emergency contact not found.', null, 404);
  }

  await writeAuditLog(userId, 'contact_manage', context, {
    action: 'delete',
    contact_id: contactId,
  });

  return null;
}

async function bindingQrcode(userId, context = {}) {
  await assertUserAvailable(userId);

  const qrCode = uuidv4().replace(/-/g, '');
  const expireAt = new Date(Date.now() + BINDING_QR_TTL_MS);
  const record = await FamilyBindingModel.createQrcodeBinding(userId, qrCode, expireAt);

  await writeAuditLog(userId, 'binding_qrcode', context, {
    binding_id: record.id,
    expire_at: expireAt,
  });

  return {
    qr_code: qrCode,
    expire_at: expireAt,
    binding_id: record.id,
  };
}

async function approveBinding(userId, payload, context = {}) {
  await assertUserAvailable(userId);

  const binding = await FamilyBindingModel.findById(payload.binding_id);
  if (!binding) {
    throw createBusinessError(404, 'Binding record not found.', null, 404);
  }

  if (Number(binding.elder_user_id) !== Number(userId)) {
    throw createBusinessError(403, 'No permission for this binding.', null, 403);
  }

  if (binding.binding_status !== 'pending') {
    throw createBusinessError(400, 'Binding status can no longer be changed.', null, 400);
  }

  const nextStatus = payload.action === 'approve' ? 'approved' : 'rejected';
  const updated = await FamilyBindingModel.updateStatus(binding.id, nextStatus);
  if (!updated) {
    throw createBusinessError(400, 'Failed to update binding status.', null, 400);
  }

  await writeAuditLog(userId, 'binding_approve', context, {
    binding_id: binding.id,
    binding_status: nextStatus,
  });

  return {
    binding_id: updated.id,
    binding_status: updated.binding_status,
  };
}

async function deleteAccountByCode(userId, code, context = {}) {
  const user = await assertUserAvailable(userId);

  if (!user.phone) {
    throw createBusinessError(400, 'User phone is required for account deletion.', null, 400);
  }

  const verifyResult = await smsService.verifyAndConsumeCode(user.phone, code, 'account_delete');
  if (!verifyResult.valid) {
    throw createBusinessError(400, verifyResult.message || 'SMS code verification failed.', null, 400);
  }

  await UserModel.softDelete(userId);
  await redis.del(`auth:refresh:${userId}`);

  await writeAuditLog(userId, 'account_delete', context, null);
  return null;
}

async function unlockAccount(phone, code, context = {}) {
  const authService = require('./authService');
  const result = await authService.unlockAccountByCode(phone, code, context);
  return result;
}

async function deleteAccount(userId, code, context = {}) {
  return deleteAccountByCode(userId, code, context);
}

module.exports = {
  getProfile,
  updateProfile,
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  setPrimaryContact,
  deleteEmergencyContact,
  bindingQrcode,
  approveBinding,
  deleteAccount,
  deleteAccountByCode,
  unlockAccount,
};