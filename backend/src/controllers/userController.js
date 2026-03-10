'use strict';

const { ok, fail } = require('../utils/response');
const userService = require('../services/userService');
const {
  validatePhone,
  validateSmsCode,
  validateRequired,
} = require('../utils/validators');

function getContext(req) {
  return {
    ipAddress: req.headers['x-forwarded-for'] || req.ip,
    userAgent: req.headers['user-agent'] || '',
  };
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

async function getProfile(req, res) {
  try {
    const data = await userService.getProfile(req.user.userId);
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateProfile(req, res) {
  try {
    const payload = {
      real_name: req.body.real_name,
      age: req.body.age,
      gender: req.body.gender,
      chronic_diseases: req.body.chronic_diseases,
    };

    const data = await userService.updateProfile(req.user.userId, payload, getContext(req));
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function listEmergencyContacts(req, res) {
  try {
    const data = await userService.listEmergencyContacts(req.user.userId);
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function createEmergencyContact(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['name', 'phone', 'relationship']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) {
      return fail(res, 400, phoneCheck.message, null, 400);
    }

    const data = await userService.createEmergencyContact(
      req.user.userId,
      {
        name: req.body.name,
        phone: req.body.phone,
        relationship: req.body.relationship,
        is_primary: req.body.is_primary,
      },
      getContext(req)
    );

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateEmergencyContact(req, res) {
  try {
    const contactId = parsePositiveInt(req.params.id);
    if (!contactId) {
      return fail(res, 400, 'Invalid contact id.', null, 400);
    }

    if (!req.body || typeof req.body !== 'object') {
      return fail(res, 400, 'Request body is required.', null, 400);
    }

    if (req.body.phone !== undefined) {
      const phoneCheck = validatePhone(req.body.phone);
      if (!phoneCheck.valid) {
        return fail(res, 400, phoneCheck.message, null, 400);
      }
    }

    const data = await userService.updateEmergencyContact(
      req.user.userId,
      contactId,
      {
        name: req.body.name,
        phone: req.body.phone,
        relationship: req.body.relationship,
        is_primary: req.body.is_primary,
      },
      getContext(req)
    );

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function setPrimaryContact(req, res) {
  try {
    const contactId = parsePositiveInt(req.params.id);
    if (!contactId) {
      return fail(res, 400, 'Invalid contact id.', null, 400);
    }

    const data = await userService.setPrimaryContact(req.user.userId, contactId, getContext(req));
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function deleteEmergencyContact(req, res) {
  try {
    const contactId = parsePositiveInt(req.params.id);
    if (!contactId) {
      return fail(res, 400, 'Invalid contact id.', null, 400);
    }

    await userService.deleteEmergencyContact(req.user.userId, contactId, getContext(req));
    return ok(res, null);
  } catch (err) {
    return handleError(res, err);
  }
}

async function createBindingQrcode(req, res) {
  try {
    const data = await userService.bindingQrcode(req.user.userId, getContext(req));
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function approveBinding(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['binding_id', 'action']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    const bindingId = parsePositiveInt(req.body.binding_id);
    if (!bindingId) {
      return fail(res, 400, 'binding_id is invalid.', null, 400);
    }

    if (!['approve', 'reject'].includes(req.body.action)) {
      return fail(res, 400, 'action must be approve or reject.', null, 400);
    }

    const data = await userService.approveBinding(
      req.user.userId,
      { binding_id: bindingId, action: req.body.action },
      getContext(req)
    );

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

async function deleteAccount(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['code']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    const codeCheck = validateSmsCode(req.body.code);
    if (!codeCheck.valid) {
      return fail(res, 400, codeCheck.message, null, 400);
    }

    await userService.deleteAccount(req.user.userId, req.body.code, getContext(req));
    return ok(res, null);
  } catch (err) {
    return handleError(res, err);
  }
}

async function unlockAccount(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone', 'code']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) {
      return fail(res, 400, phoneCheck.message, null, 400);
    }

    const codeCheck = validateSmsCode(req.body.code);
    if (!codeCheck.valid) {
      return fail(res, 400, codeCheck.message, null, 400);
    }

    const data = await userService.unlockAccount(req.body.phone, req.body.code, getContext(req));
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  listEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  setPrimaryContact,
  deleteEmergencyContact,
  createBindingQrcode,
  approveBinding,
  deleteAccount,
  unlockAccount,
};
