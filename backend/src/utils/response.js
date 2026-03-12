'use strict';

// API response envelope: { code, message, data }

const ok = (res, data = null, message = 'ok') => {
  return res.json({ code: 0, message, data });
};

const fail = (res, code, message, data = null, httpStatus = null) => {
  const status = httpStatus || (code >= 400 && code < 600 ? code : 400);
  return res.status(status).json({ code, message, data });
};

module.exports = { ok, fail };
