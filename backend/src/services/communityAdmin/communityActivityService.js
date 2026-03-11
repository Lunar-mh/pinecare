'use strict';

const communityAdminModel = require('../../models/communityAdmin');
const statisticsService = require('../statisticsService');
const { createBizError, normalizePagination, requireCommunityScope } = require('./shared');

const communityActivityService = {
  async getActivities(communityId, query = {}) {
    requireCommunityScope(communityId);

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
    requireCommunityScope(communityId);

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
    requireCommunityScope(communityId);

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

module.exports = communityActivityService;
