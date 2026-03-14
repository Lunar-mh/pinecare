'use strict';

const redis = require('../config/redis');
const adminUserModel = require('../models/adminUserModel');

function createBusinessError(code, message, statusCode = null, data = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  err.data = data;
  return err;
}

function toDateString(date) {
  if (!date) return '';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateTimeString(date) {
  if (!date) return '从未登录';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '从未登录';

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function toDisplayStatus(accountStatus) {
  if (accountStatus === 'active') return '正常';
  if (accountStatus === 'deleted') return '已注销';
  return '禁用';
}

function toAccountStatus(input) {
  if (!input) return null;
  const normalized = String(input).trim().toLowerCase();

  if (['active', 'enabled', '正常'].includes(normalized)) {
    return 'active';
  }

  if (['locked', 'disabled', '禁用'].includes(normalized)) {
    return 'locked';
  }

  if (['deleted', '已注销'].includes(normalized)) {
    return 'deleted';
  }

  return null;
}

function toAdminUser(row, options = {}) {
  const role = options.roleOverride || row.user_role || 'elder';
  return {
    id: Number(row.id),
    nickname: row.nickname || `用户${row.id}`,
    phone: row.phone || '',
    role,
    status: toDisplayStatus(row.account_status),
    age: row.age === null || row.age === undefined ? undefined : Number(row.age),
    address: undefined,
    registerDate: toDateString(row.created_at),
    lastActive: toDateTimeString(row.last_login_at),
  };
}

function normalizeFilters(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);

  let role = null;
  if (query.role === 'elder' || query.role === 'family') {
    role = query.role;
  }

  const accountStatus = toAccountStatus(query.status);
  if (query.status && !accountStatus) {
    throw createBusinessError(400, 'Invalid status.', 400);
  }

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    filters: {
      search: query.search ? String(query.search).trim() : '',
      role,
      accountStatus,
    },
  };
}

function assertGlobalAdminScope(scope) {
  if (!scope || scope.isGlobalAdmin !== true) {
    throw createBusinessError(403, 'Admin users endpoint requires global admin scope.', 403);
  }
}

const adminUserService = {
  async listUsers(scope, query = {}) {
    assertGlobalAdminScope(scope);
    const normalized = normalizeFilters(query);
    const [rows, total] = await Promise.all([
      adminUserModel.listUsers(normalized.filters, {
        pageSize: normalized.pageSize,
        offset: normalized.offset,
      }),
      adminUserModel.countUsers(normalized.filters),
    ]);

    return {
      list: rows.map((row) => toAdminUser(row)),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize,
    };
  },

  async getUserDetail(scope, userId) {
    assertGlobalAdminScope(scope);
    const row = await adminUserModel.findById(userId);
    if (!row) {
      throw createBusinessError(404, 'User not found.', 404);
    }
    return toAdminUser(row);
  },

  async createUser(scope, payload = {}) {
    assertGlobalAdminScope(scope);
    const nickname = String(payload.nickname || '').trim();
    const phone = String(payload.phone || '').trim();
    const role = String(payload.role || '').trim();

    if (!nickname) {
      throw createBusinessError(400, 'nickname is required.', 400);
    }

    if (!phone) {
      throw createBusinessError(400, 'phone is required.', 400);
    }

    if (!['elder', 'family'].includes(role)) {
      throw createBusinessError(400, 'role must be elder or family.', 400);
    }

    try {
      const userId = await adminUserModel.createUser({ nickname, phone, role });
      const row = await adminUserModel.findById(userId);
      if (!row) {
        throw createBusinessError(500, 'Create user failed.', 500);
      }
      return toAdminUser(row);
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw createBusinessError(409, 'Phone already exists.', 409);
      }
      throw err;
    }
  },

  async updateUserStatus(scope, userId, status) {
    assertGlobalAdminScope(scope);
    const accountStatus = toAccountStatus(status);
    if (!accountStatus) {
      throw createBusinessError(400, 'Invalid status.', 400);
    }

    const affectedRows = await adminUserModel.updateStatus(userId, accountStatus);
    if (!affectedRows) {
      throw createBusinessError(404, 'User not found.', 404);
    }

    await redis.del(`auth:refresh:${userId}`);
    return null;
  },
};

module.exports = adminUserService;