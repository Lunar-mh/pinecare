'use strict';

const communityAdminModel = require('../models/communityAdmin');
const statisticsService = require('./statisticsService');

const ORDER_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];

function createBizError(message, code = 400, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizePagination(pagination = {}) {
  const page = Math.max(Number(pagination.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(pagination.pageSize) || 10, 1), 100);
  return { page, pageSize };
}

const communityAdminService = {
  ORDER_STATUS_ENUM,

  generateOrderNo() {
    return communityAdminModel.generateOrderNo();
  },

  isValidOrderStatus(status) {
    return ORDER_STATUS_ENUM.includes(status);
  },

  async getVolunteers(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
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

  async getOrders(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
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
      throw createBizError('Order status is invalid.', 400, 400);
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

  async createOrder(communityId, body = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }
    if (!body.service_type || String(body.service_type).trim() === '') {
      throw createBizError('service_type is required.', 400, 400);
    }
    if (!body.elder_id) {
      throw createBizError('elder_id is required.', 400, 400);
    }
    if (body.status && !this.isValidOrderStatus(body.status)) {
      throw createBizError('Order status is invalid.', 400, 400);
    }

    return communityAdminModel.createOrder({
      orderNo: this.generateOrderNo(),
      communityId,
      serviceType: String(body.service_type).trim(),
      elderId: Number(body.elder_id),
      volunteerId: body.volunteer_id ? Number(body.volunteer_id) : null,
      status: body.status || 'pending',
      scheduledAt: body.scheduled_at || null,
      completedAt: body.completed_at || null,
    });
  },

  async getActivities(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
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

  async createActivity(communityId, body = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }
    if (!body.title || String(body.title).trim() === '') {
      throw createBizError('title is required.', 400, 400);
    }
    if (!body.content || String(body.content).trim() === '') {
      throw createBizError('content is required.', 400, 400);
    }
    if (!body.start_time || !body.end_time) {
      throw createBizError('start_time and end_time are required.', 400, 400);
    }

    const startMs = new Date(body.start_time).getTime();
    const endMs = new Date(body.end_time).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw createBizError('Activity time format is invalid.', 400, 400);
    }
    if (startMs >= endMs) {
      throw createBizError('Activity start time must be earlier than end time.', 400, 400);
    }

    if (body.max_participants !== undefined && body.max_participants !== null) {
      const maxParticipants = Number(body.max_participants);
      if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
        throw createBizError('max_participants must be a positive integer.', 400, 400);
      }
    }

    return communityAdminModel.createActivity({
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
  },

  async getStats(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }
    if (query.start_date && Number.isNaN(new Date(query.start_date).getTime())) {
      throw createBizError('start_date format is invalid.', 400, 400);
    }
    if (query.end_date && Number.isNaN(new Date(query.end_date).getTime())) {
      throw createBizError('end_date format is invalid.', 400, 400);
    }
    if (query.start_date && query.end_date) {
      const startMs = new Date(query.start_date).getTime();
      const endMs = new Date(query.end_date).getTime();
      if (startMs > endMs) {
        throw createBizError('start_date must not be later than end_date.', 400, 400);
      }
    }

    return statisticsService.getCommunityDashboardStats(communityId);
  },
};

module.exports = communityAdminService;
