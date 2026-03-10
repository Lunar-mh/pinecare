'use strict';

const { createRateLimiter } = require('./rateLimiter');

const companionChatRateLimiter = createRateLimiter({
  max: 20,
  windowSeconds: 60,
  keyPrefix: 'ratelimit:companion-chat',
});

module.exports = {
  companionChatRateLimiter,
};
