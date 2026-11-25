'use strict';

/**
 * @fileoverview 银伴系统统一 Redis 键命名规范与 TTL 常量定义
 * 严格执行根命名空间 yinban 与层级结构 yinban:{module}:{entity}:{id}
 * 强制显式声明 TTL 过期时间，严禁无期限持久 Key
 */

const ROOT_NAMESPACE = 'yinban';

/**
 * @description 统一显式 TTL 过期时间定义（单位：秒）
 */
const TTL = Object.freeze({
  REFRESH_TOKEN: 7 * 24 * 3600, // 7天
  ADMIN_SESSION: 7 * 24 * 3600, // 7天
  SMS_CODE: 300, // 5分钟
  SMS_DAILY_LIMIT: 24 * 3600, // 24小时
  SMS_VERIFY_FAIL: 900, // 15分钟
  FALL_SETTINGS: 300, // 5分钟
  FALL_TIMER: 15, // 跌倒取消倒计时 15秒
  LOCATION_CACHE: 300, // 5分钟
  REFILL_REMINDER: 24 * 3600, // 24小时
  SOS_NOTIFY_DEDUPE: 300, // 5分钟
  SOS_LOCK_MS: 30000, // 分布式锁 30秒
  EMPTY_CACHE: 60, // 防穿透空对象 60秒
});

/**
 * @description 统一键命名空间构建器
 */
const redisKeys = {
  ROOT_NAMESPACE,
  TTL,

  /**
   * 用户 Refresh Token 缓存键
   * @param {number|string} userId 用户ID
   * @returns {string} yinban:auth:refresh:{userId}
   */
  authRefreshToken(userId) {
    return `${ROOT_NAMESPACE}:auth:refresh:${userId}`;
  },

  /**
   * 管理员会话缓存键
   * @param {string} sessionId 会话ID
   * @returns {string} yinban:auth:admin_session:{sessionId}
   */
  authAdminSession(sessionId) {
    return `${ROOT_NAMESPACE}:auth:admin_session:${sessionId}`;
  },

  /**
   * 接口滑动窗口限流键
   * @param {string} prefix 限流业务前缀
   * @param {string} identifier IP或用户ID标识
   * @returns {string} yinban:rate_limit:{prefix}:{identifier}
   */
  rateLimit(prefix, identifier) {
    return `${ROOT_NAMESPACE}:rate_limit:${prefix}:${identifier}`;
  },

  /**
   * 短信验证码缓存键
   * @param {string} phone 手机号
   * @returns {string} yinban:sms:code:{phone}
   */
  smsCode(phone) {
    return `${ROOT_NAMESPACE}:sms:code:${phone}`;
  },

  /**
   * 短信每日发送计数键
   * @param {string} phone 手机号
   * @returns {string} yinban:sms:daily_count:{phone}
   */
  smsDailyCount(phone) {
    return `${ROOT_NAMESPACE}:sms:daily_count:${phone}`;
  },

  /**
   * 短信验证失败频次防刷键
   * @param {string} phone 手机号
   * @returns {string} yinban:sms:verify_fail:{phone}
   */
  smsVerifyFail(phone) {
    return `${ROOT_NAMESPACE}:sms:verify_fail:${phone}`;
  },

  /**
   * 跌倒检测用户配置缓存键
   * @param {number|string} userId 用户ID
   * @returns {string} yinban:fall:settings:{userId}
   */
  fallSettings(userId) {
    return `${ROOT_NAMESPACE}:fall:settings:${userId}`;
  },

  /**
   * 跌倒倒计时定时器键（15秒内可取消）
   * @param {number|string} eventId 跌倒事件ID
   * @returns {string} yinban:fall:timer:{eventId}
   */
  fallTimer(eventId) {
    return `${ROOT_NAMESPACE}:fall:timer:${eventId}`;
  },

  /**
   * 长辈最新 GPS 坐标缓存键
   * @param {number|string} userId 长辈用户ID
   * @returns {string} yinban:location:latest:{userId}
   */
  locationLatest(userId) {
    return `${ROOT_NAMESPACE}:location:latest:${userId}`;
  },

  /**
   * 慢病药品补药余量预警防重键
   * @param {number|string} userId 用户ID
   * @param {string} medicineName 药品名
   * @param {string} date 日期
   * @returns {string} yinban:medication:refill_reminder:{userId}:{medicineName}:{date}
   */
  refillReminder(userId, medicineName, date) {
    return `${ROOT_NAMESPACE}:medication:refill_reminder:${userId}:${medicineName}:${date}`;
  },

  /**
   * SOS 通知渠道防重键（避免重复给同一联系人发短信/微信）
   * @param {number|string} eventId SOS 事件ID
   * @param {number|string} contactId 紧急联系人ID
   * @returns {string} yinban:sos:notify_dedupe:{eventId}:{contactId}
   */
  sosNotifyDedupe(eventId, contactId) {
    return `${ROOT_NAMESPACE}:sos:notify_dedupe:${eventId}:${contactId}`;
  },

  /**
   * SOS 异步通知任务队列键
   * @returns {string} yinban:sos:notification_queue:default
   */
  sosNotificationQueue() {
    return `${ROOT_NAMESPACE}:sos:notification_queue:default`;
  },

  /**
   * SOS 消费工作进程分布式排他锁键
   * @returns {string} yinban:sos:worker_lock:default
   */
  sosWorkerLock() {
    return `${ROOT_NAMESPACE}:sos:worker_lock:default`;
  },
};

module.exports = redisKeys;
