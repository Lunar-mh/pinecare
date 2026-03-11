'use strict';

const statisticsModel = require('../models/statisticsModel');
const communityAdminModel = require('../models/communityAdmin');

function isTableMissingError(err) {
  return Boolean(err && (err.code === 'ER_NO_SUCH_TABLE' || String(err.message || '').includes('doesn\'t exist')));
}

const statisticsService = {
  async getOverview() {
    try {
      const data = await statisticsModel.getOverview();
      return {
        stats: [
          { label: '活跃用户', value: String(data.totalUsers), unit: '人', color: '#01579b', bg: '#e3f2fd', trend: '' },
          { label: '今日健康记录', value: String(data.healthRecordsToday), unit: '条', color: '#2e7d32', bg: '#e8f5e9', trend: '' },
          { label: '待处理工单', value: String(data.pendingOrders), unit: '单', color: '#e65100', bg: '#fff3e0', trend: '' },
          { label: '进行中SOS', value: String(data.activeSosEvents), unit: '条', color: '#6a1b9a', bg: '#f3e5f5', trend: '' },
        ],
        recentActivities: [],
      };
    } catch (err) {
      if (isTableMissingError(err)) {
        return {
          stats: [
            { label: '活跃用户', value: '--', unit: '人', color: '#01579b', bg: '#e3f2fd', trend: '' },
            { label: '今日健康记录', value: '--', unit: '条', color: '#2e7d32', bg: '#e8f5e9', trend: '' },
            { label: '待处理工单', value: '--', unit: '单', color: '#e65100', bg: '#fff3e0', trend: '' },
            { label: '进行中SOS', value: '--', unit: '条', color: '#6a1b9a', bg: '#f3e5f5', trend: '' },
          ],
          recentActivities: [],
        };
      }
      throw err;
    }
  },

  async getActivities(rawLimit) {
    const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 50);
    try {
      const rows = await statisticsModel.getActivities(limit);
      return rows.map((item) => ({
        id: Number(item.id),
        type: item.action || 'system',
        user: item.user_id ? String(item.user_id) : 'system',
        time: item.created_at,
        status: '完成',
      }));
    } catch (err) {
      if (isTableMissingError(err)) {
        return [];
      }
      throw err;
    }
  },

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

module.exports = statisticsService;
