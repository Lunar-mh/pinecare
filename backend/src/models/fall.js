'use strict';

const { query } = require('../config/database');

const EVENT_COLUMNS = `id, user_id, status, sensor_data, sensitivity,
  detected_at, cancelled_at, confirmed_at, created_at`;

/**
 * 跌倒检测数据模型
 */
class FallModel {
  /**
   * 创建跌倒事件记录（内部统一入口）
   * @param {number} userId
   * @param {'detecting'|'false_alarm'} status
   * @param {object} sensorData
   * @param {'high'|'medium'|'low'} sensitivity
   * @returns {Promise<number>}
   */
  static async _createEvent(userId, status, sensorData, sensitivity) {
    const [result] = await query(
      `INSERT INTO fall_events (user_id, status, sensor_data, sensitivity, detected_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, status, JSON.stringify(sensorData || {}), sensitivity]
    );
    return result.insertId;
  }

  /**
   * 创建检测中事件
   * @param {number} userId
   * @param {object} sensorData
   * @param {'high'|'medium'|'low'} sensitivity
   * @returns {Promise<number>}
   */
  static async createDetectingEvent(userId, sensorData, sensitivity) {
    return FallModel._createEvent(userId, 'detecting', sensorData, sensitivity);
  }

  /**
   * 创建误报事件
   * @param {number} userId
   * @param {object} sensorData
   * @param {'high'|'medium'|'low'} sensitivity
   * @returns {Promise<number>}
   */
  static async createFalseAlarmEvent(userId, sensorData, sensitivity) {
    return FallModel._createEvent(userId, 'false_alarm', sensorData, sensitivity);
  }

  /**
   * 查询单个事件（内部统一入口）
   * @param {string} whereClause
   * @param {Array} params
   * @returns {Promise<object|null>}
   */
  static async _findSingleEvent(whereClause, params) {
    const [rows] = await query(
      `SELECT ${EVENT_COLUMNS}
       FROM fall_events
       WHERE ${whereClause}
       LIMIT 1`,
      params
    );
    return rows.length > 0 ? FallModel._formatEvent(rows[0]) : null;
  }

  /**
   * 根据事件与用户查询
   * @param {number} eventId
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  static async findEventByIdAndUser(eventId, userId) {
    return FallModel._findSingleEvent('id = ? AND user_id = ?', [eventId, userId]);
  }

  /**
   * 根据事件ID查询
   * @param {number} eventId
   * @returns {Promise<object|null>}
   */
  static async findEventById(eventId) {
    return FallModel._findSingleEvent('id = ?', [eventId]);
  }

  /**
   * 从 detecting 流转至目标状态
   * @param {number} eventId
   * @param {string} setClause
   * @returns {Promise<boolean>}
   */
  static async _transitionFromDetecting(eventId, setClause) {
    const [result] = await query(
      `UPDATE fall_events
       SET ${setClause}
       WHERE id = ? AND status = 'detecting'`,
      [eventId]
    );
    return result.affectedRows > 0;
  }

  /**
   * 标记已取消
   * @param {number} eventId
   * @returns {Promise<boolean>}
   */
  static async markCancelled(eventId) {
    return FallModel._transitionFromDetecting(eventId, "status = 'cancelled', cancelled_at = NOW()");
  }

  /**
   * 标记已确认
   * @param {number} eventId
   * @returns {Promise<boolean>}
   */
  static async markConfirmed(eventId) {
    return FallModel._transitionFromDetecting(eventId, "status = 'confirmed', confirmed_at = NOW()");
  }

  /**
   * 标记误报
   * @param {number} eventId
   * @returns {Promise<boolean>}
   */
  static async markFalseAlarm(eventId) {
    return FallModel._transitionFromDetecting(eventId, "status = 'false_alarm'");
  }

  /**
   * 查询超过阈值仍处于 detecting 的事件
   * @param {number} seconds
   * @returns {Promise<object[]>}
   */
  static async findExpiredDetectingEvents(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 15;
    const [rows] = await query(
      `SELECT ${EVENT_COLUMNS}
       FROM fall_events
       WHERE status = 'detecting'
         AND detected_at <= DATE_SUB(NOW(), INTERVAL ? SECOND)
       ORDER BY detected_at ASC`,
      [safeSeconds]
    );

    return rows.map((row) => FallModel._formatEvent(row));
  }

  static _buildHistoryFilter(userId, status) {
    let whereSql = 'WHERE user_id = ?';
    const params = [userId];
    if (status) {
      whereSql += ' AND status = ?';
      params.push(status);
    }
    return { whereSql, params };
  }

  /**
   * 历史总数
   * @param {number} userId
   * @param {{status?: string|null}} filters
   * @returns {Promise<number>}
   */
  static async countHistory(userId, { status = null } = {}) {
    const { whereSql, params } = FallModel._buildHistoryFilter(userId, status);
    const [rows] = await query(`SELECT COUNT(1) AS total FROM fall_events ${whereSql}`, params);
    return rows[0] ? rows[0].total : 0;
  }

  /**
   * 历史分页
   * @param {number} userId
   * @param {{page:number,pageSize:number,status?:string|null}} options
   * @returns {Promise<object[]>}
   */
  static async listHistory(userId, { page = 1, pageSize = 10, status = null } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (safePage - 1) * safePageSize;
    const { whereSql, params } = FallModel._buildHistoryFilter(userId, status);

    const [rows] = await query(
      `SELECT ${EVENT_COLUMNS}
       FROM fall_events
       ${whereSql}
       ORDER BY detected_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset]
    );
    return rows.map((row) => FallModel._formatEvent(row));
  }

  /**
   * 查询灵敏度设置
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  static async getSensitivitySetting(userId) {
    const [rows] = await query(
      `SELECT id, user_id, sensitivity, created_at, updated_at
       FROM fall_settings
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      sensitivity: row.sensitivity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 更新或创建灵敏度设置
   * @param {number} userId
   * @param {'high'|'medium'|'low'} sensitivity
   * @returns {Promise<void>}
   */
  static async upsertSensitivitySetting(userId, sensitivity) {
    await query(
      `INSERT INTO fall_settings (user_id, sensitivity)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         sensitivity = VALUES(sensitivity),
         updated_at = NOW()`,
      [userId, sensitivity]
    );
  }

  /**
   * 查询可通知联系人
   * 说明：不同环境联系人表命名可能不同，按候选表逐个尝试兼容。
   * @param {number} userId
   * @returns {Promise<Array<{contactId:number,contactType:string,notifyMethod:string,phone:string|null,wechatOpenId:string|null}>>}
   */
  static async getNotificationContacts(userId) {
    const candidates = [
      {
        sql: `SELECT id AS contact_id,
                     COALESCE(contact_type, 'family') AS contact_type,
                     COALESCE(notify_method, 'wechat') AS notify_method,
                     phone,
                     wechat_openid
              FROM emergency_contacts
              WHERE user_id = ? AND (enabled = 1 OR enabled IS NULL)`,
        params: [userId],
      },
      {
        sql: `SELECT id AS contact_id,
                     COALESCE(type, 'family') AS contact_type,
                     COALESCE(notify_method, 'wechat') AS notify_method,
                     phone,
                     wechat_openid
              FROM family_contacts
              WHERE user_id = ? AND (status = 'active' OR status IS NULL)`,
        params: [userId],
      },
      {
        sql: `SELECT id AS contact_id,
                     COALESCE(contact_type, 'community') AS contact_type,
                     COALESCE(notify_method, 'sms') AS notify_method,
                     phone,
                     wechat_openid
              FROM user_contacts
              WHERE user_id = ? AND (is_active = 1 OR is_active IS NULL)`,
        params: [userId],
      },
    ];

    for (const item of candidates) {
      try {
        const [rows] = await query(item.sql, item.params);
        return rows.map((row) => ({
          contactId: row.contact_id,
          contactType: row.contact_type,
          notifyMethod: row.notify_method,
          phone: row.phone || null,
          wechatOpenId: row.wechat_openid || null,
        }));
      } catch (err) {
        if (!FallModel._isSchemaError(err)) {
          throw err;
        }
      }
    }

    return [];
  }

  /**
   * 批量创建通知记录
   * @param {number} eventId
   * @param {Array<{contactId:number,contactType:string,notifyMethod:string}>} contacts
   * @returns {Promise<void>}
   */
  static async createNotificationRecords(eventId, contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return;
    }

    const placeholders = contacts.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = [];
    contacts.forEach((contact) => {
      params.push(
        eventId,
        contact.contactId,
        contact.contactType || 'family',
        contact.notifyMethod || 'wechat',
        'pending'
      );
    });

    await query(
      `INSERT INTO fall_notifications (event_id, contact_id, contact_type, notify_method, status)
       VALUES ${placeholders}`,
      params
    );
  }

  /**
   * 更新通知状态
   * @param {number} notificationId
   * @param {'pending'|'sent'|'failed'} status
   * @returns {Promise<void>}
   */
  static async updateNotificationStatus(notificationId, status) {
    await query(
      `UPDATE fall_notifications
       SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE sent_at END
       WHERE id = ?`,
      [status, status, notificationId]
    );
  }

  /**
   * 查询事件下通知记录
   * @param {number} eventId
   * @returns {Promise<object[]>}
   */
  static async findNotificationsByEventId(eventId) {
    const grouped = await FallModel.findNotificationsByEventIds([eventId]);
    return grouped[Number(eventId)] || [];
  }

  static async findNotificationsByEventIds(eventIds) {
    const ids = Array.isArray(eventIds)
      ? eventIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
      : [];

    if (ids.length === 0) {
      return {};
    }

    const placeholders = ids.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT id, event_id, contact_id, contact_type, notify_method, status, sent_at, created_at
       FROM fall_notifications
       WHERE event_id IN (${placeholders})
       ORDER BY event_id ASC, id ASC`,
      ids
    );

    return rows.reduce((acc, row) => {
      const eventId = Number(row.event_id);
      if (!acc[eventId]) {
        acc[eventId] = [];
      }

      acc[eventId].push({
        id: row.id,
        eventId: row.event_id,
        contactId: row.contact_id,
        contactType: row.contact_type,
        notifyMethod: row.notify_method,
        status: row.status,
        sentAt: row.sent_at,
        createdAt: row.created_at,
      });
      return acc;
    }, {});
  }

  /**
   * 格式化事件字段
   * @param {object} row
   * @returns {object}
   */
  static _formatEvent(row) {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      sensorData: FallModel._parseJson(row.sensor_data),
      sensitivity: row.sensitivity,
      detectedAt: row.detected_at,
      cancelledAt: row.cancelled_at,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
    };
  }

  /**
   * 安全 JSON 解析
   * @param {any} value
   * @returns {object|null}
   */
  static _parseJson(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch (_err) {
      return null;
    }
  }

  /**
   * 判断是否为可容忍的库表兼容错误
   * @param {Error} err
   * @returns {boolean}
   */
  static _isSchemaError(err) {
    if (!err) return false;
    return (
      err.code === 'ER_NO_SUCH_TABLE' ||
      err.code === 'ER_BAD_FIELD_ERROR' ||
      err.code === 'ER_PARSE_ERROR' ||
      /doesn't exist/i.test(err.message || '')
    );
  }
}

module.exports = FallModel;
