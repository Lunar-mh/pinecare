'use strict';

const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const UserModel = require('../models/user');
const EmergencyContactModel = require('../models/emergencyContact');
const FamilyBindingModel = require('../models/familyBinding');
const AuditLogModel = require('../models/auditLog');
const smsService = require('./smsService');

const MAX_EMERGENCY_CONTACTS = 5;
const BINDING_QR_TTL_MS = 15 * 60 * 1000;

function createBusinessError(code, message, data = null, httpStatus = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = httpStatus || code;
  err.data = data;
  return err;
}

async function writeAuditLog(userId, action, context = {}, details = null) {
  await AuditLogModel.create({
    userId: userId || null,
    action,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    details,
  });
}

async function assertUserAvailable(userId) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw createBusinessError(404, '用户不存在', null, 404);
  }
  if (user.account_status === 'deleted') {
    throw createBusinessError(403, '账户已注销', null, 403);
  }
  return user;
}

async function getProfile(userId) {
  const profile = await UserModel.getProfileById(userId);
  if (!profile) {
    throw createBusinessError(404, '用户不存在', null, 404);
  }
  if (profile.account_status === 'deleted') {
    throw createBusinessError(403, '账户已注销', null, 403);
  }
  return profile;
}

async function updateProfile(userId, payload, context = {}) {
  await assertUserAvailable(userId);

  if (payload.age !== undefined && (!Number.isInteger(payload.age) || payload.age < 0 || payload.age > 120)) {
    throw createBusinessError(400, '年龄必须为 0 到 120 的整数', null, 400);
  }

  if (payload.gender !== undefined && !['male', 'female', 'unknown'].includes(payload.gender)) {
    throw createBusinessError(400, '性别参数不合法', null, 400);
  }

  if (payload.chronic_diseases !== undefined && !Array.isArray(payload.chronic_diseases)) {
    throw createBusinessError(400, '慢性病字段必须为数组', null, 400);
  }

  const profile = await UserModel.updateProfile(userId, payload);
  await writeAuditLog(userId, 'profile_update', context, {
    fields: Object.keys(payload || {}),
  });

  return profile;
}

async function listEmergencyContacts(userId) {
  await assertUserAvailable(userId);
  return EmergencyContactModel.listByUserId(userId);
}

async function createEmergencyContact(userId, payload, context = {}) {
  await assertUserAvailable(userId);

  const total = await EmergencyContactModel.countByUserId(userId);
  if (total >= MAX_EMERGENCY_CONTACTS) {
    throw createBusinessError(400, `紧急联系人最多 ${MAX_EMERGENCY_CONTACTS} 位`, null, 400);
  }

  const created = await EmergencyContactModel.create(userId, {
    name: payload.name,
    phone: payload.phone,
    relationship: payload.relationship,
    isPrimary: Boolean(payload.is_primary),
  });

  await writeAuditLog(userId, 'contact_manage', context, {
    action: 'create',
    contact_id: created.id,
  });

  return created;
}

async function deleteEmergencyContact(userId, contactId, context = {}) {
  await assertUserAvailable(userId);

  const affectedRows = await EmergencyContactModel.deleteByIdAndUserId(contactId, userId);
  if (!affectedRows) {
    throw createBusinessError(404, '联系人不存在', null, 404);
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
    throw createBusinessError(404, '绑定记录不存在', null, 404);
  }

  if (Number(binding.elder_user_id) !== Number(userId)) {
    throw createBusinessError(403, '无权操作该绑定记录', null, 403);
  }

  if (binding.binding_status !== 'pending') {
    throw createBusinessError(400, '绑定状态不可再次变更', null, 400);
  }

  const nextStatus = payload.action === 'approve' ? 'approved' : 'rejected';
  const updated = await FamilyBindingModel.updateStatus(binding.id, nextStatus);
  if (!updated) {
    throw createBusinessError(400, '绑定状态更新失败', null, 400);
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
    throw createBusinessError(400, '当前账号未绑定手机号，无法验证码注销', null, 400);
  }

  const verifyResult = await smsService.verifyAndConsumeCode(user.phone, code, 'reset_password');
  if (!verifyResult.valid) {
    throw createBusinessError(400, verifyResult.message || '验证码校验失败', null, 400);
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
  deleteEmergencyContact,
  bindingQrcode,
  approveBinding,
  deleteAccount,
  deleteAccountByCode,
  unlockAccount,
};
