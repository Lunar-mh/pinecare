'use strict';

const communityAdminModel = require('../models/communityAdmin');

/**
 * 统计服务：聚合社区看板概览与工单状态分布
 */
const statsService = {
  /**
   * 获取社区看板统计
   * @param {number} communityId
   * @returns {Promise<{overview: object, order_distribution: object}>}
   */
  async getCommunityDashboardStats(communityId) {
    const data = await communityAdminModel.getStatsData(Number(communityId));

    return {
      overview: {
        active_elders: Number(data.overview.active_elders || 0),
        volunteers: Number(data.overview.volunteers || 0),
        total_orders: Number(data.overview.total_orders || 0),
        total_service_hours: Number(data.overview.total_service_hours || 0),
      },
      order_distribution: {
        pending: Number(data.order_distribution.pending || 0),
        assigned: Number(data.order_distribution.assigned || 0),
        processing: Number(data.order_distribution.processing || 0),
        completed: Number(data.order_distribution.completed || 0),
        cancelled: Number(data.order_distribution.cancelled || 0),
      },
    };
  },
};

module.exports = statsService;
