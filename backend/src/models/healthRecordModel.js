'use strict';

const { query } = require('../config/db');

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
 * 统一执行查询
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
async function execute(sql, params) {
  const result = await query(sql, params);
  return unwrapQueryResult(result);
}

/**
 * 将数据库字段转为业务字段
 * @param {object} row
 * @returns {object}
 */
function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    metricType: row.metric_type,
    value: row.value,
    valueHigh: row.value_high,
    valueLow: row.value_low,
    source: row.source,
    deviceId: row.device_id,
    measuredAt: row.measured_at,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
  };
}

const healthRecordModel = {
  /**
   * 查询用户今日健康记录（按时间倒序）
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async getTodayRecords(userId) {
    const rows = await execute(
      `SELECT id, user_id, metric_type, value, value_high, value_low, source, device_id, measured_at, synced_at, created_at
       FROM health_records
       WHERE user_id = ?
         AND measured_at >= CURDATE()
         AND measured_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
       ORDER BY measured_at DESC, id DESC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },

  /**
   * 查询趋势数据
   * @param {number} userId
   * @param {string} metricType
   * @param {string} period
   * @returns {Promise<object[]>}
   */
  async getTrendData(userId, metricType, period) {
    const days = period === '30d' ? 30 : 7;

    const rows = await execute(
      `SELECT id, user_id, metric_type, value, value_high, value_low, source, device_id, measured_at, synced_at, created_at
       FROM health_records
       WHERE user_id = ?
         AND metric_type = ?
         AND measured_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY measured_at ASC, id ASC`,
      [userId, metricType, days]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },

  /**
   * 批量写入设备同步数据
   * @param {object[]} records
   * @returns {Promise<number>}
   */
  async batchInsert(records) {
    if (!Array.isArray(records) || records.length === 0) {
      return 0;
    }

    const placeholders = records.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];

    records.forEach((item) => {
      params.push(item.userId);
      params.push(item.metricType);
      params.push(String(item.value));
      params.push(item.valueHigh !== undefined ? item.valueHigh : null);
      params.push(item.valueLow !== undefined ? item.valueLow : null);
      params.push(item.source || 'device');
      params.push(item.deviceId || null);
      params.push(item.measuredAt || new Date());
      params.push(item.syncedAt || new Date());
    });

    const result = await execute(
      `INSERT INTO health_records
       (user_id, metric_type, value, value_high, value_low, source, device_id, measured_at, synced_at)
       VALUES ${placeholders}`,
      params
    );

    return result && result.affectedRows ? result.affectedRows : records.length;
  },

  /**
   * 插入手动录入记录
   * @param {object} record
   * @returns {Promise<object>}
   */
  async insertManual(record) {
    const result = await execute(
      `INSERT INTO health_records
       (user_id, metric_type, value, value_high, value_low, source, device_id, measured_at, synced_at)
       VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?)`,
      [
        record.userId,
        record.metricType,
        String(record.value),
        record.valueHigh !== undefined ? record.valueHigh : null,
        record.valueLow !== undefined ? record.valueLow : null,
        record.deviceId || null,
        record.measuredAt || new Date(),
        record.syncedAt || new Date(),
      ]
    );

    const insertId = result && result.insertId ? result.insertId : null;
    return {
      id: insertId,
      userId: record.userId,
      metricType: record.metricType,
      value: String(record.value),
      valueHigh: record.valueHigh !== undefined ? record.valueHigh : null,
      valueLow: record.valueLow !== undefined ? record.valueLow : null,
      source: 'manual',
      deviceId: record.deviceId || null,
      measuredAt: record.measuredAt || new Date(),
      syncedAt: record.syncedAt || new Date(),
    };
  },

  /**
   * 查询指定指标最新一条记录
   * @param {number} userId
   * @param {string} metricType
   * @returns {Promise<object|null>}
   */
  async getLatestByMetricType(userId, metricType) {
    const rows = await execute(
      `SELECT id, user_id, metric_type, value, value_high, value_low, source, device_id, measured_at, synced_at, created_at
       FROM health_records
       WHERE user_id = ?
         AND metric_type = ?
       ORDER BY measured_at DESC, id DESC
       LIMIT 1`,
      [userId, metricType]
    );
    const list = Array.isArray(rows) ? rows : [];
    return list.length > 0 ? mapRow(list[0]) : null;
  },
};

module.exports = healthRecordModel;
