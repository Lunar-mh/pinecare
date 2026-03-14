'use strict';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePhone(phone) {
  if (typeof phone !== 'string') {
    return { valid: false, message: 'Invalid phone number.' };
  }
  return { valid: PHONE_REGEX.test(phone.trim()), message: 'Invalid phone number.' };
}

function validateSmsCode(code) {
  if (typeof code !== 'string') {
    return { valid: false, message: 'Invalid SMS code.' };
  }
  return { valid: CODE_REGEX.test(code.trim()), message: 'Invalid SMS code.' };
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return {
      valid: false,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, and number.',
    };
  }
  return {
    valid: PASSWORD_REGEX.test(password),
    message: 'Password must be at least 8 characters and include uppercase, lowercase, and number.',
  };
}

function validatePagination(page, pageSize) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedPageSize = Number.parseInt(pageSize, 10);

  const finalPage = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const finalPageSize = Number.isNaN(parsedPageSize) ? 20 : parsedPageSize;

  if (finalPage < 1) {
    return { valid: false, message: 'page must be greater than or equal to 1.' };
  }
  if (finalPageSize < 1 || finalPageSize > 100) {
    return { valid: false, message: 'pageSize must be between 1 and 100.' };
  }

  return {
    valid: true,
    data: {
      page: finalPage,
      pageSize: finalPageSize,
      offset: (finalPage - 1) * finalPageSize,
      limit: finalPageSize,
    },
  };
}

function validateRequired(payload, fields) {
  const missing = [];
  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  return { valid: true };
}

module.exports = {
  validatePhone,
  validateSmsCode,
  validatePassword,
  validatePagination,
  validateRequired,
};