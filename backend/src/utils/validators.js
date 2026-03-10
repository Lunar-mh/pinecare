'use strict';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePhone(phone) {
  if (typeof phone !== 'string') {
    return { valid: false, message: '手机号格式不正确' };
  }
  return { valid: PHONE_REGEX.test(phone.trim()), message: '手机号格式不正确' };
}

function validateSmsCode(code) {
  if (typeof code !== 'string') {
    return { valid: false, message: '验证码格式不正确' };
  }
  return { valid: CODE_REGEX.test(code.trim()), message: '验证码格式不正确' };
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, message: '密码格式不正确' };
  }
  return {
    valid: PASSWORD_REGEX.test(password),
    message: '密码至少8位，且必须包含大小写字母和数字',
  };
}

function validatePagination(page, pageSize) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedPageSize = Number.parseInt(pageSize, 10);

  const finalPage = Number.isNaN(parsedPage) ? 1 : parsedPage;
  const finalPageSize = Number.isNaN(parsedPageSize) ? 20 : parsedPageSize;

  if (finalPage < 1) {
    return { valid: false, message: 'page 必须大于等于 1' };
  }
  if (finalPageSize < 1 || finalPageSize > 100) {
    return { valid: false, message: 'pageSize 必须在 1 到 100 之间' };
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
    return { valid: false, message: `缺少必填参数: ${missing.join(', ')}` };
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
