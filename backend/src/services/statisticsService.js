'use strict';

const statisticsModel = require('../models/statisticsModel');
const communityAdminModel = require('../models/communityAdmin');

const OVERVIEW_CARD_META = [
  {
    key: 'totalUsers',
    label: '\u6d3b\u8dc3\u7528\u6237',
    unit: '\u4eba',
    color: '#01579b',
    bg: '#e3f2fd',
  },
  {
    key: 'healthRecordsToday',
    label: '\u4eca\u65e5\u5065\u5eb7\u8bb0\u5f55',
    unit: '\u6761',
    color: '#2e7d32',
    bg: '#e8f5e9',
  },
  {
    key: 'pendingOrders',
    label: '\u5f85\u5904\u7406\u5de5\u5355',
    unit: '\u5355',
    color: '#e65100',
    bg: '#fff3e0',
  },
  {
    key: 'activeSosEvents',
    label: '\u8fdb\u884c\u4e2dSOS',
    unit: '\u6761',
    color: '#6a1b9a',
    bg: '#f3e5f5',
  },
];

function isTableMissingError(err) {
  return Boolean(
    err && (err.code === 'ER_NO_SUCH_TABLE' || String(err.message || '').includes("doesn't exist"))
  );
}

function buildOverviewCards(data = null) {
  return OVERVIEW_CARD_META.map((item) => ({
    label: item.label,
    value: data ? String(data[item.key]) : '--',
    unit: item.unit,
    color: item.color,
    bg: item.bg,
    trend: '',
  }));
}

const statisticsService = {
  async getOverview() {
    try {
      const data = await statisticsModel.getOverview();
      return {
        stats: buildOverviewCards(data),
        recentActivities: [],
      };
    } catch (err) {
      if (isTableMissingError(err)) {
        return {
          stats: buildOverviewCards(),
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
        status: '\u5b8c\u6210',
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
