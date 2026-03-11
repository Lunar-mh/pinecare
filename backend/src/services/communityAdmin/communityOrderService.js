'use strict';

const communityAdminModel = require('../../models/communityAdmin');
const {
  ORDER_STATUS_ENUM,
  createBizError,
  normalizePagination,
  requireCommunityScope,
  writeAuditLog,
} = require('./shared');

const communityOrderService = {
  ORDER_STATUS_ENUM,

  generateOrderNo() {
    return communityAdminModel.generateOrderNo();
  },

  isValidOrderStatus(status) {
    return ORDER_STATUS_ENUM.includes(status);
  },

  async getVolunteers(communityId, query = {}) {
    requireCommunityScope(communityId);

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
    requireCommunityScope(communityId);

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
    requireCommunityScope(communityId);

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
    requireCommunityScope(communityId);

    const order = await communityAdminModel.findOrderById(communityId, orderId);
    if (!order) {
      throw createBizError('Order not found.', 404, 404);
    }

    return order;
  },

  async assignOrder(communityId, orderId, body = {}, actor = {}) {
    requireCommunityScope(communityId);

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
    requireCommunityScope(communityId);

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
};

module.exports = communityOrderService;
