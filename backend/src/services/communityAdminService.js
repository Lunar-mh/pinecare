'use strict';

const adminOpsModel = require('../models/adminOpsModel');
const communityAdminModel = require('../models/communityAdmin');
const AuditLogModel = require('../models/auditLog');
const adminOpsService = require('./adminOpsService');
const statisticsService = require('./statisticsService');

const ORDER_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const SOS_STATUS_ENUM = ['triggered', 'confirmed', 'resolved', 'cancelled'];

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

async function writeAuditLog(actor = {}, action, details = null) {
  await AuditLogModel.create({
    userId: actor.userId || null,
    action,
    details,
  });
}

function toIsoText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatSosNotificationSummary(summaryRows) {
  const summaryMap = {};

  summaryRows.forEach((row) => {
    const eventId = Number(row.sos_event_id);
    if (!summaryMap[eventId]) {
      summaryMap[eventId] = {
        wechat: { pending: 0, sent: 0, failed: 0 },
        sms: { pending: 0, sent: 0, failed: 0 },
        total: { pending: 0, sent: 0, failed: 0 },
      };
    }

    const pending = Number(row.pending_count) || 0;
    const sent = Number(row.sent_count) || 0;
    const failed = Number(row.failed_count) || 0;
    const channel = row.notify_type === 'wechat' ? 'wechat' : 'sms';

    summaryMap[eventId][channel] = { pending, sent, failed };
    summaryMap[eventId].total.pending += pending;
    summaryMap[eventId].total.sent += sent;
    summaryMap[eventId].total.failed += failed;
  });

  return summaryMap;
}

function buildSosAuditTrailSummary(row) {
  const triggeredAt = toIsoText(row.created_at);
  return {
    currentStatus: row.event_status,
    triggeredAt,
    confirmedAt: toIsoText(row.confirmed_at),
    resolvedAt: toIsoText(row.resolved_at),
    cancelledAt: toIsoText(row.cancelled_at),
  };
}

function mapSosEvent(row, summaryMap) {
  const createdAt = toIsoText(row.created_at);
  const latestStatusChangedAt =
    toIsoText(row.cancelled_at) ||
    toIsoText(row.resolved_at) ||
    toIsoText(row.confirmed_at) ||
    createdAt;

  return {
    eventId: Number(row.id),
    userId: Number(row.user_id),
    userName: row.nickname || `User${row.user_id}`,
    userPhone: row.phone || '',
    eventStatus: row.event_status,
    triggerType: row.trigger_type,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    address: row.address || '',
    createdAt,
    confirmedAt: toIsoText(row.confirmed_at),
    resolvedAt: toIsoText(row.resolved_at),
    cancelledAt: toIsoText(row.cancelled_at),
    latestStatusChangedAt,
    notificationSummary: summaryMap[Number(row.id)] || {
      wechat: { pending: 0, sent: 0, failed: 0 },
      sms: { pending: 0, sent: 0, failed: 0 },
      total: { pending: 0, sent: 0, failed: 0 },
    },
    auditTrailSummary: buildSosAuditTrailSummary(row),
  };
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

  async getOrderDetail(communityId, orderId) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const order = await communityAdminModel.findOrderById(communityId, orderId);
    if (!order) {
      throw createBizError('Order not found.', 404, 404);
    }

    return order;
  },

  async assignOrder(communityId, orderId, body = {}, actor = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const order = await communityAdminModel.findOrderById(communityId, orderId);
    if (!order) {
      throw createBizError('Order not found.', 404, 404);
    }
    if (order.status !== 'pending') {
      throw createBizError('Only pending orders can be assigned.', 409, 409);
    }

    const volunteerId = Number(body.volunteer_id);
    const volunteer = await communityAdminModel.findVolunteerInCommunity(communityId, volunteerId);
    if (!volunteer) {
      throw createBizError('Volunteer not found in community.', 404, 404);
    }

    const scheduledAt = body.scheduled_at || order.scheduled_at || null;
    const result = await communityAdminModel.assignOrder(
      communityId,
      orderId,
      volunteerId,
      scheduledAt
    );
    if (!result || result.affectedRows < 1) {
      throw createBizError('Order assignment failed, please retry.', 409, 409);
    }

    const latest = await communityAdminModel.findOrderById(communityId, orderId);
    await writeAuditLog(actor, 'community.order.assign', {
      community_id: Number(communityId),
      order_id: Number(orderId),
      volunteer_user_id: volunteerId,
      status_from: order.status,
      status_to: latest.status,
    });

    return latest;
  },

  async updateOrderStatus(communityId, orderId, body = {}, actor = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const order = await communityAdminModel.findOrderById(communityId, orderId);
    if (!order) {
      throw createBizError('Order not found.', 404, 404);
    }

    const targetStatus = String(body.status || '').trim();
    if (!['cancelled', 'completed'].includes(targetStatus)) {
      throw createBizError('Unsupported order status.', 400, 400);
    }

    if (
      targetStatus === 'cancelled' &&
      !['pending', 'assigned', 'processing'].includes(order.status)
    ) {
      throw createBizError(
        'Only pending, assigned or processing orders can be cancelled.',
        409,
        409
      );
    }

    if (targetStatus === 'completed' && !['assigned', 'processing'].includes(order.status)) {
      throw createBizError(
        'Only assigned or processing orders can be completed by admin.',
        409,
        409
      );
    }

    const payload = {};
    let action = 'community.order.cancel';
    if (targetStatus === 'completed') {
      payload.completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      action = 'community.order.complete_override';
    } else if (order.status === 'pending') {
      payload.volunteerId = null;
    }

    const result = await communityAdminModel.updateOrderStatus(
      communityId,
      orderId,
      targetStatus,
      payload
    );
    if (!result || result.affectedRows < 1) {
      throw createBizError('Order status update failed, please retry.', 409, 409);
    }

    const latest = await communityAdminModel.findOrderById(communityId, orderId);
    await writeAuditLog(actor, action, {
      community_id: Number(communityId),
      order_id: Number(orderId),
      volunteer_user_id: latest.volunteer_id === null ? null : Number(latest.volunteer_id),
      status_from: order.status,
      status_to: latest.status,
      reason: body.reason ? String(body.reason).trim() : null,
    });

    return latest;
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

  async getHealthOverview(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getHealthOverview({
      ...query,
      communityId,
    });
  },

  async getMedicationLogs(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getMedicationLogs({
      ...query,
      communityId,
    });
  },

  async updateMedicationLogStatus(communityId, logId, body = {}, actor = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const result = await adminOpsService.updateMedicationLogStatus(logId, {
      ...body,
      communityId,
    });

    await writeAuditLog(actor, 'community.medication.log_status_update', {
      community_id: Number(communityId),
      log_id: Number(logId),
      status_to: result.status,
    });

    return result;
  },

  async getGpsCurrent(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getGpsCurrent({
      ...query,
      communityId,
    });
  },

  async getGpsTrail(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getGpsTrail({
      ...query,
      communityId,
    });
  },

  async getFamilyBindings(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getFamilyBindings({
      ...query,
      communityId,
    });
  },

  async getSosEvents(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const pagination = normalizePagination(query);
    const search = query.search ? String(query.search).trim() : '';
    const status = query.status ? String(query.status).trim() : '';

    if (status && !SOS_STATUS_ENUM.includes(status)) {
      throw createBizError('SOS status is invalid.', 400, 400);
    }

    const offset = (pagination.page - 1) * pagination.pageSize;
    const [rows, total] = await Promise.all([
      adminOpsModel.listSosEvents(
        { search, status, communityId },
        { pageSize: pagination.pageSize, offset }
      ),
      adminOpsModel.countSosEvents({ search, status, communityId }),
    ]);

    const eventIds = rows.map((item) => Number(item.id));
    const summaryRows = await adminOpsModel.summarizeSosNotifications(eventIds);
    const summaryMap = formatSosNotificationSummary(summaryRows);

    return {
      list: rows.map((item) => mapSosEvent(item, summaryMap)),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  },

  async getMedicalReports(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getMedicalReports({
      ...query,
      communityId,
    });
  },

  async updateSosEventStatus(communityId, eventId, body = {}, actor = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const id = Number(eventId);
    if (!Number.isInteger(id) || id <= 0) {
      throw createBizError('eventId must be a positive integer.', 400, 400);
    }

    const targetStatus = String(body.status || '').trim();
    if (!['confirmed', 'resolved', 'cancelled'].includes(targetStatus)) {
      throw createBizError('Unsupported SOS status.', 400, 400);
    }

    const current = await adminOpsModel.getSosEventById(id, communityId);
    if (!current) {
      throw createBizError('SOS event not found.', 404, 404);
    }

    const allowedFlow = {
      triggered: ['confirmed', 'cancelled'],
      confirmed: ['resolved'],
      resolved: [],
      cancelled: [],
    };

    if (!(allowedFlow[current.event_status] || []).includes(targetStatus)) {
      throw createBizError(
        `Cannot transition SOS event from ${current.event_status} to ${targetStatus}.`,
        409,
        409
      );
    }

    const affected = await adminOpsModel.updateSosEventStatus(
      id,
      current.event_status,
      targetStatus
    );
    if (!affected) {
      throw createBizError('SOS event status changed concurrently, please retry.', 409, 409);
    }

    const latest = await adminOpsModel.getSosEventById(id, communityId);
    const actionMap = {
      confirmed: 'community.sos.confirm',
      resolved: 'community.sos.resolve',
      cancelled: 'community.sos.cancel',
    };

    await writeAuditLog(actor, actionMap[targetStatus], {
      community_id: Number(communityId),
      event_id: id,
      status_from: current.event_status,
      status_to: targetStatus,
      reason: body.reason ? String(body.reason).trim() : null,
    });

    const summaryRows = await adminOpsModel.summarizeSosNotifications([id]);
    const summaryMap = formatSosNotificationSummary(summaryRows);
    return mapSosEvent(latest, summaryMap);
  },

  async getFallEvents(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getFallEvents({
      ...query,
      communityId,
    });
  },

  async getDrugInteractions(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getDrugInteractions({
      ...query,
      communityId,
    });
  },

  async updateDrugInteractionStatus(communityId, interactionId, body = {}, actor = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const result = await adminOpsService.updateDrugInteractionStatus(interactionId, {
      ...body,
      communityId,
    });

    await writeAuditLog(actor, 'community.drug_interaction.status_update', {
      community_id: Number(communityId),
      interaction_id: Number(interactionId),
      status_to: result.status,
    });

    return result;
  },

  async getTimeBankServiceHistory(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getTimeBankServiceHistory({
      ...query,
      communityId,
    });
  },

  async confirmTimeBankService(communityId, body = {}, actor = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    const result = await adminOpsService.confirmTimeBankService({
      ...body,
      communityId,
    });

    await writeAuditLog(actor, 'community.time_bank.service_settle', {
      community_id: Number(communityId),
      record_id: Number(result.recordId),
      status_to: result.status,
    });

    return result;
  },

  async getTimeBankExchangeHistory(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getTimeBankExchangeHistory({
      ...query,
      communityId,
    });
  },

  async getTimeBankLeaderboard(communityId, query = {}) {
    if (!communityId) {
      throw createBizError('Community scope is required.', 403, 403);
    }

    return adminOpsService.getTimeBankLeaderboard({
      ...query,
      communityId,
    });
  },
};

module.exports = communityAdminService;
