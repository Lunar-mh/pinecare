'use strict';

const { query } = require('./shared');

module.exports = {
  async getStatsData(communityId) {
    const [overviewRows] = await query(
      `SELECT
         COUNT(DISTINCT so.elder_id) AS active_elders,
         (
           SELECT COUNT(1)
           FROM community_admins ca
           WHERE ca.community_id = ? AND ca.role = 'volunteer'
         ) AS volunteers,
         COUNT(1) AS total_orders,
         COALESCE(SUM(
           CASE
             WHEN so.status = 'completed' AND so.scheduled_at IS NOT NULL AND so.completed_at IS NOT NULL
             THEN GREATEST(TIMESTAMPDIFF(MINUTE, so.scheduled_at, so.completed_at), 0)
             ELSE 0
           END
         ), 0) / 60 AS total_service_hours
       FROM service_orders so
       WHERE so.community_id = ?`,
      [communityId, communityId]
    );

    const overview = overviewRows[0] || {};

    const [distributionRows] = await query(
      `SELECT so.status, COUNT(1) AS count
       FROM service_orders so
       WHERE so.community_id = ?
       GROUP BY so.status`,
      [communityId]
    );

    const orderDistribution = {
      pending: 0,
      assigned: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };

    distributionRows.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(orderDistribution, item.status)) {
        orderDistribution[item.status] = Number(item.count);
      }
    });

    return {
      overview: {
        active_elders: Number(overview.active_elders || 0),
        volunteers: Number(overview.volunteers || 0),
        total_orders: Number(overview.total_orders || 0),
        total_service_hours: Number(overview.total_service_hours || 0),
      },
      order_distribution: orderDistribution,
    };
  },
};
