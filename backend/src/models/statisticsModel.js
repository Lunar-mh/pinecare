'use strict';

const { query } = require('../config/db');

async function getCount(sql, params = [], key = 'total') {
  const [rows] = await query(sql, params);
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
  return Number(first[key] || 0);
}

const statisticsModel = {
  async getOverview() {
    const [totalUsers, healthRecordsToday, pendingOrders, activeSosEvents] = await Promise.all([
      getCount(
        `SELECT COUNT(1) AS total
         FROM users
         WHERE account_status = 'active'`
      ),
      getCount(
        `SELECT COUNT(1) AS total
         FROM health_records
         WHERE measured_at >= CURDATE()
           AND measured_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
      ),
      getCount(
        `SELECT COUNT(1) AS total
         FROM service_orders
         WHERE status IN ('pending', 'assigned', 'processing')`
      ),
      getCount(
        `SELECT COUNT(1) AS total
         FROM sos_events
         WHERE event_status IN ('triggered', 'confirmed')`
      ),
    ]);

    return {
      totalUsers,
      healthRecordsToday,
      pendingOrders,
      activeSosEvents,
    };
  },

  async getActivities(limit) {
    const [rows] = await query(
      `SELECT id, user_id, action, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    return Array.isArray(rows) ? rows : [];
  },
};

module.exports = statisticsModel;
