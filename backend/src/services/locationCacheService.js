'use strict';

const redis = require('../config/redis');

const LOCATION_CACHE_TTL_SECONDS = 3600;

/**
 * 生成最新位置缓存 key
 * @param {number} userId
 * @returns {string}
 */
function getLocationKey(userId) {
  return `location:${userId}`;
}

const locationCacheService = {
  /**
   * 写入用户最新位置缓存，TTL 固定 3600 秒
   * @param {number} userId
   * @param {object} location
   * @returns {Promise<void>}
   */
  async setCurrentLocation(userId, location) {
    const key = getLocationKey(userId);
    await redis.set(key, JSON.stringify(location), 'EX', LOCATION_CACHE_TTL_SECONDS);
  },

  /**
   * 读取用户最新位置缓存
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async getCurrentLocation(userId) {
    const key = getLocationKey(userId);
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  },
};

module.exports = locationCacheService;
