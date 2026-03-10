'use strict';

const { query } = require('../config/database');

let bindingColumnCache = null;

/**
 * 兼容 query 返回结构（rows 或 [rows, fields]）
 * @param {any} result
 * @returns {any}
 */
function unwrapQueryResult(result) {
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

/**
 * 执行 SQL 并返回 rows
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
async function execute(sql, params = []) {
  const result = await query(sql, params);
  return unwrapQueryResult(result);
}

/**
 * 兼容不同历史版本的 family_bindings 字段命名
 * @returns {Promise<{elderColumn:string,familyColumn:string,statusColumn:string,activeValue:string}>}
 */
async function resolveBindingColumns() {
  if (bindingColumnCache) {
    return bindingColumnCache;
  }

  const columns = await execute('SHOW COLUMNS FROM family_bindings');
  const fields = new Set((Array.isArray(columns) ? columns : []).map((item) => item.Field));

  const elderColumn = fields.has('elder_id') ? 'elder_id' : 'elder_user_id';
  const familyColumn = fields.has('family_id') ? 'family_id' : 'family_user_id';
  const statusColumn = fields.has('status') ? 'status' : 'binding_status';
  const activeValue = statusColumn === 'status' ? 'active' : 'approved';

  bindingColumnCache = {
    elderColumn,
    familyColumn,
    statusColumn,
    activeValue,
  };

  return bindingColumnCache;
}

/**
 * 映射通知设置行
 * @param {object|null} row
 * @returns {object|null}
 */
function mapNotificationSettings(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    healthAlertEnabled: Boolean(row.health_alert_enabled),
    medicationReminderEnabled: Boolean(row.medication_reminder_enabled),
    sosAlertEnabled: Boolean(row.sos_alert_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const familyModel = {
  /**
   * 查询家属绑定的老人列表（仅激活状态）
   * @param {number} familyId
   * @returns {Promise<object[]>}
   */
  async listBindingsByFamilyId(familyId) {
    const { elderColumn, familyColumn, statusColumn, activeValue } = await resolveBindingColumns();

    const rows = await execute(
      `SELECT fb.id,
              fb.${elderColumn} AS elder_id,
              fb.${familyColumn} AS family_id,
              fb.${statusColumn} AS status,
              fb.created_at AS binding_created_at,
              u.nickname AS elder_nickname,
              u.real_name AS elder_name,
              u.avatar_url AS elder_avatar,
              u.gender AS elder_gender,
              u.age AS elder_age,
              ha.id AS health_archive_id,
              ha.updated_at AS health_updated_at
       FROM family_bindings fb
       INNER JOIN users u ON u.id = fb.${elderColumn}
       LEFT JOIN health_archives ha ON ha.user_id = fb.${elderColumn}
       WHERE fb.${familyColumn} = ?
         AND fb.${statusColumn} = ?
       ORDER BY fb.id DESC`,
      [familyId, activeValue]
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => ({
      bindingId: row.id,
      elderId: row.elder_id,
      familyId: row.family_id,
      status: row.status,
      boundAt: row.binding_created_at,
      elderProfile: {
        nickname: row.elder_nickname,
        realName: row.elder_name,
        avatarUrl: row.elder_avatar,
        gender: row.elder_gender,
        age: row.elder_age,
      },
      healthArchive: {
        id: row.health_archive_id,
        updatedAt: row.health_updated_at,
      },
    }));
  },

  /**
   * 校验家属是否与老人存在激活绑定关系
   * @param {number} familyId
   * @param {number} elderId
   * @returns {Promise<boolean>}
   */
  async checkFamilyBinding(familyId, elderId) {
    const { elderColumn, familyColumn, statusColumn, activeValue } = await resolveBindingColumns();

    const rows = await execute(
      `SELECT id
       FROM family_bindings
       WHERE ${familyColumn} = ?
         AND ${elderColumn} = ?
         AND ${statusColumn} = ?
       LIMIT 1`,
      [familyId, elderId, activeValue]
    );

    return Array.isArray(rows) && rows.length > 0;
  },

  /**
   * 查询老人最新健康快照
   * @param {number} elderId
   * @returns {Promise<object|null>}
   */
  async getLatestHealthSnapshot(elderId) {
    const archiveRows = await execute(
      `SELECT id, user_id, created_at, updated_at
       FROM health_archives
       WHERE user_id = ?
       LIMIT 1`,
      [elderId]
    );

    if (!Array.isArray(archiveRows) || archiveRows.length === 0) {
      return null;
    }

    const archive = archiveRows[0];

    const recordRows = await execute(
      `SELECT id, metric_type, value, value_high, value_low, source, measured_at, synced_at, created_at
       FROM health_records
       WHERE user_id = ?
       ORDER BY measured_at DESC, id DESC
       LIMIT 20`,
      [elderId]
    );

    const latestRecords = Array.isArray(recordRows)
      ? recordRows.map((row) => ({
          id: row.id,
          metricType: row.metric_type,
          value: row.value,
          valueHigh: row.value_high,
          valueLow: row.value_low,
          source: row.source,
          measuredAt: row.measured_at,
          syncedAt: row.synced_at,
          createdAt: row.created_at,
        }))
      : [];

    return {
      archive: {
        id: archive.id,
        userId: archive.user_id,
        createdAt: archive.created_at,
        updatedAt: archive.updated_at,
      },
      latestRecords,
    };
  },

  /**
   * 查询用户通知设置
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async findNotificationSettingsByUserId(userId) {
    const rows = await execute(
      `SELECT user_id, health_alert_enabled, medication_reminder_enabled, sos_alert_enabled, created_at, updated_at
       FROM notification_settings
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapNotificationSettings(rows[0]);
  },

  /**
   * 新增或更新通知设置
   * @param {number} userId
   * @param {{healthAlertEnabled:boolean,medicationReminderEnabled:boolean,sosAlertEnabled:boolean}} payload
   * @returns {Promise<object|null>}
   */
  async upsertNotificationSettings(userId, payload) {
    await execute(
      `INSERT INTO notification_settings
       (user_id, health_alert_enabled, medication_reminder_enabled, sos_alert_enabled)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         health_alert_enabled = VALUES(health_alert_enabled),
         medication_reminder_enabled = VALUES(medication_reminder_enabled),
         sos_alert_enabled = VALUES(sos_alert_enabled),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        payload.healthAlertEnabled ? 1 : 0,
        payload.medicationReminderEnabled ? 1 : 0,
        payload.sosAlertEnabled ? 1 : 0,
      ]
    );

    return this.findNotificationSettingsByUserId(userId);
  },

  /**
   * 查询老人最新GPS位置（表可能不存在）
   * @param {number} elderId
   * @returns {Promise<object|null>}
   */
  async getLatestLocation(elderId) {
    try {
      const rows = await execute(
        `SELECT latitude, longitude, address, updated_at
         FROM gps_locations
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT 1`,
        [elderId]
      );
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const row = rows[0];
      return {
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address || '',
        updatedAt: row.updated_at,
      };
    } catch (_) {
      return null;
    }
  },
};

module.exports = familyModel;
