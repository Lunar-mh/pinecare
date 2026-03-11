'use strict';

const { sanitizeObject, sanitizeText } = require('./thirdParty');

function log(level, moduleName, action, payload = null) {
  const record = {
    level,
    module: moduleName,
    action,
  };

  if (payload && typeof payload === 'object') {
    Object.assign(record, sanitizeObject(payload));
  } else if (payload !== null && payload !== undefined) {
    record.message = sanitizeText(payload);
  }

  const line = JSON.stringify(record);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

module.exports = {
  error(moduleName, action, payload) {
    log('error', moduleName, action, payload);
  },
  info(moduleName, action, payload) {
    log('info', moduleName, action, payload);
  },
  warn(moduleName, action, payload) {
    log('warn', moduleName, action, payload);
  },
};
