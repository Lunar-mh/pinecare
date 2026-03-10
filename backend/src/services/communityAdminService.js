'use strict';

const communityAdminModel = require('../models/communityAdmin');
const statsService = require('./statsService');

const ORDER_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];

/**
 * 创建标准业务异常
 * @param {string} message
 * @param {number} code
 * @param {number} statusCode
 * @returns {Error}
 */
function createBizError(message, code = 400, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/**
 * 规范化分页参数
 * @param {object} pagination
 * @returns {{page:number,pageSize:number}}
 */
function normalizePagination(pagination = {}) {
  const page = Math.max(Number(pagination.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(pagination.pageSize) || 10, 1), 100);
  return { page, pageSize };
}

const communityAdminService = {
  ORDER_STATUS_ENUM,

  /**
   * 工单号生成器（复用模型层规则）
   * @returns {string}
   */
  generateOrderNo() {
    return communityAdminModel.generateOrderNo();
  },

  /**
   * 校验工单状态枚举值
   * @param {string} status
   * @returns {boolean}
   */
  isValidOrderStatus(status) {
    return ORDER_STATUS_ENUM.includes(status);
  },

  /**
   * 获取志愿者列表
   * @param {number} communityId
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getVolunteers(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('缺少社区作用域', 403, 403);
    }

    const pagination = normalizePagination(query);
    const filters = {
      keyword: query.keyword ? String(query.keyword).trim() : '',
    };

    const [list, total] = await Promise.all([
      communityAdminModel.listVolunteers(communityId, filters, pagination),
      communityAdminModel.countVolunteers(communityId, filters),
    ]);

    return {
      list,
      pagination: {
        page: pagination.page,
        page_size: pagination.pageSize,
        total,
      },
    };
  },

  /**
   * 获取工单列表
   * @param {number} communityId
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getOrders(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('缺少社区作用域', 403, 403);
    }

    const pagination = normalizePagination(query);
    const filters = {
      status: query.status,
      serviceType: query.service_type,
      elderId: query.elder_id,
      volunteerId: query.volunteer_id,
      startDate: query.start_date,
      endDate: query.end_date,
    };

    if (filters.status && !this.isValidOrderStatus(filters.status)) {
      throw createBizError('工单状态不合法', 400, 400);
    }

    const [total, list] = await Promise.all([
      communityAdminModel.countOrders(communityId, filters),
      communityAdminModel.listOrders(communityId, filters, pagination),
    ]);

    return {
      list,
      pagination: {
        page: pagination.page,
        page_size: pagination.pageSize,
        total,
      },
    };
  },

  /**
   * 创建工单
   * @param {number} communityId
   * @param {object} body
   * @returns {Promise<object>}
   */
  async createOrder(communityId, body = {}) {
    if (!communityId) {
      throw createBizError('缺少社区作用域', 403, 403);
    }

    if (!body.service_type || String(body.service_type).trim() === '') {
      throw createBizError('service_type 为必填项', 400, 400);
    }

    if (!body.elder_id) {
      throw createBizError('elder_id 为必填项', 400, 400);
    }

    if (body.status && !this.isValidOrderStatus(body.status)) {
      throw createBizError('工单状态不合法', 400, 400);
    }

    const order = await communityAdminModel.createOrder({
      orderNo: this.generateOrderNo(),
      communityId,
      serviceType: String(body.service_type).trim(),
      elderId: Number(body.elder_id),
      volunteerId: body.volunteer_id ? Number(body.volunteer_id) : null,
      status: body.status || 'pending',
      scheduledAt: body.scheduled_at || null,
      completedAt: body.completed_at || null,
    });

    return order;
  },

  /**
   * 获取活动列表
   * @param {number} communityId
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getActivities(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('缺少社区作用域', 403, 403);
    }

    const pagination = normalizePagination(query);
    const filters = {
      keyword: query.keyword,
      startTime: query.start_time,
      endTime: query.end_time,
    };

    const [list, total] = await Promise.all([
      communityAdminModel.listActivities(communityId, filters, pagination),
      communityAdminModel.countActivities(communityId, filters),
    ]);

    return {
      list,
      pagination: {
        page: pagination.page,
        page_size: pagination.pageSize,
        total,
      },
    };
  },

  /**
   * 创建活动
   * @param {number} communityId
   * @param {object} body
   * @returns {Promise<object>}
   */
  async createActivity(communityId, body = {}) {
    if (!communityId) {
      throw createBizError('缺少社区作用域', 403, 403);
    }

    if (!body.title || String(body.title).trim() === '') {
      throw createBizError('title 为必填项', 400, 400);
    }

    if (!body.content || String(body.content).trim() === '') {
      throw createBizError('content 为必填项', 400, 400);
    }

    if (!body.start_time || !body.end_time) {
      throw createBizError('start_time 与 end_time 为必填项', 400, 400);
    }

    const startMs = new Date(body.start_time).getTime();
    const endMs = new Date(body.end_time).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw createBizError('活动时间格式不正确', 400, 400);
    }

    if (startMs >= endMs) {
      throw createBizError('活动开始时间必须早于结束时间', 400, 400);
    }

    if (body.max_participants !== undefined && body.max_participants !== null) {
      const maxParticipants = Number(body.max_participants);
      if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
        throw createBizError('max_participants 必须为正整数', 400, 400);
      }
    }

    const activity = await communityAdminModel.createActivity({
      communityId,
      title: String(body.title).trim(),
      content: String(body.content).trim(),
      startTime: body.start_time,
      endTime: body.end_time,
      maxParticipants:
        body.max_participants !== undefined && body.max_participants !== null
          ? Number(body.max_participants)
          : null,
    });

    return activity;
  },

  /**
   * 获取统计看板
   * @param {number} communityId
   * @param {object} query
   * @returns {Promise<object>}
   */
  async getStats(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('缺少社区作用域', 403, 403);
    }

    if (query.start_date && Number.isNaN(new Date(query.start_date).getTime())) {
      throw createBizError('start_date 格式不正确', 400, 400);
    }

    if (query.end_date && Number.isNaN(new Date(query.end_date).getTime())) {
      throw createBizError('end_date 格式不正确', 400, 400);
    }

    if (query.start_date && query.end_date) {
      const startMs = new Date(query.start_date).getTime();
      const endMs = new Date(query.end_date).getTime();
      if (startMs > endMs) {
        throw createBizError('start_date 不能晚于 end_date', 400, 400);
      }
    }

    return statsService.getCommunityDashboardStats(communityId);
  },
};

module.exports = communityAdminService;
