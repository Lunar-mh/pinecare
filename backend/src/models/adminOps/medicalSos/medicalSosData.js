'use strict';

const { query, buildWhereSql } = require('../common');

function buildSosWhere({ search = '', status = '', communityId = null }) {
  const where = [];
  const values = [];

  const text = String(search || '').trim();
  if (text) {
    const keyword = `%${text}%`;
    where.push(
      '(u.nickname LIKE ? OR u.phone LIKE ? OR e.address LIKE ? OR CAST(e.id AS CHAR) LIKE ?)'
    );
    values.push(keyword, keyword, keyword, keyword);
  }

  if (status) {
    where.push('e.event_status = ?');
    values.push(status);
  }

  if (communityId) {
    where.push('u.community_id = ?');
    values.push(Number(communityId));
  }

  return {
    whereSql: buildWhereSql(where),
    values,
  };
}

module.exports = {
  async listSosEvents(filters = {}, { pageSize = 10, offset = 0 } = {}) {
    const { whereSql, values } = buildSosWhere(filters);
    const [rows] = await query(
      `SELECT
         e.id,
         e.user_id,
         u.nickname,
         u.phone,
         e.trigger_type,
         e.latitude,
         e.longitude,
         e.address,
         e.event_status,
         e.created_at,
         e.confirmed_at,
         e.resolved_at,
         e.cancelled_at,
         e.updated_at
       FROM sos_events e
       LEFT JOIN users u ON u.id = e.user_id
       ${whereSql}
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async countSosEvents(filters = {}) {
    const { whereSql, values } = buildSosWhere(filters);
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM sos_events e
       LEFT JOIN users u ON u.id = e.user_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },

  async getSosEventById(eventId, communityId = null) {
    const values = [Number(eventId)];
    let sql = `SELECT e.id, e.user_id, e.trigger_type, e.latitude, e.longitude, e.address, e.event_status,
                      e.created_at, e.confirmed_at, e.resolved_at, e.cancelled_at, e.updated_at
               FROM sos_events e
               LEFT JOIN users u ON u.id = e.user_id
               WHERE e.id = ?`;

    if (communityId) {
      sql += ' AND u.community_id = ?';
      values.push(Number(communityId));
    }

    sql += ' LIMIT 1';

    const [rows] = await query(sql, values);

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },

  async updateSosEventStatus(eventId, fromStatus, toStatus) {
    const [result] = await query(
      `UPDATE sos_events
       SET event_status = ?,
           confirmed_at = CASE WHEN ? = 'confirmed' AND confirmed_at IS NULL THEN NOW() ELSE confirmed_at END,
           resolved_at = CASE WHEN ? = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
           cancelled_at = CASE WHEN ? = 'cancelled' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END,
           updated_at = NOW()
       WHERE id = ? AND event_status = ?`,
      [toStatus, toStatus, toStatus, toStatus, Number(eventId), fromStatus]
    );

    return Number(result && result.affectedRows ? result.affectedRows : 0);
  },

  async summarizeSosNotifications(eventIds = []) {
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return [];
    }

    const placeholders = eventIds.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT sos_event_id,
              notify_type,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count
       FROM sos_notifications
       WHERE sos_event_id IN (${placeholders})
       GROUP BY sos_event_id, notify_type`,
      eventIds
    );

    return Array.isArray(rows) ? rows : [];
  },

  async listSosNotificationDetails(eventIds = []) {
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return [];
    }

    const placeholders = eventIds.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT id,
              sos_event_id,
              contact_id,
              contact_name,
              notify_type,
              notify_target,
              status,
              retry_count,
              error_message,
              sent_at,
              created_at,
              updated_at
       FROM sos_notifications
       WHERE sos_event_id IN (${placeholders})
       ORDER BY sos_event_id ASC, id ASC`,
      eventIds
    );

    return Array.isArray(rows) ? rows : [];
  },
};
