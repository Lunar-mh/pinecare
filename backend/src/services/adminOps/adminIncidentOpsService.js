'use strict';

const adminOpsModel = require('../../models/adminOpsModel');
const { buildSosNotificationSummaryMap } = require('../../utils/sosNotificationSummary');
const { buildNotificationDetailMap, createEmptyDelivery, EMPTY_SUMMARY } = require('./notificationDelivery');
const {
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parsePositiveInt,
} = require('./shared');

async function loadSosNotificationState(eventIds) {
  const [summaryRows, detailRows] = await Promise.all([
    adminOpsModel.summarizeSosNotifications(eventIds),
    adminOpsModel.listSosNotificationDetails(eventIds),
  ]);
  const summaryMap = buildSosNotificationSummaryMap(summaryRows);

  return {
    summaryMap,
    detailMap: buildNotificationDetailMap(detailRows, summaryMap),
  };
}

function buildSosEventList(rows, summaryMap, detailMap) {
  return rows.map((item) => ({
    event_id: Number(item.id),
    user_id: Number(item.user_id),
    user_name: item.nickname || `User${item.user_id}`,
    user_phone: item.phone || '',
    event_status: item.event_status,
    trigger_type: item.trigger_type,
    latitude: item.latitude,
    longitude: item.longitude,
    address: item.address,
    created_at: item.created_at,
    confirmed_at: item.confirmed_at,
    resolved_at: item.resolved_at,
    cancelled_at: item.cancelled_at,
    notification_summary: summaryMap[item.id] || EMPTY_SUMMARY,
    notification_delivery: detailMap[item.id] || createEmptyDelivery(summaryMap[item.id] || EMPTY_SUMMARY),
  }));
}

const adminIncidentOpsService = {
  async getSosEvents(query = {}) {
    const { page, pageSize, offset } = normalizePagination(query);
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();

    const allowedStatus = ['', 'triggered', 'confirmed', 'resolved', 'cancelled'];
    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listSosEvents({ search, status }, { pageSize, offset }),
        adminOpsModel.countSosEvents({ search, status }),
      ]);
      const eventIds = rows.map((item) => Number(item.id));
      const { summaryMap, detailMap } = await loadSosNotificationState(eventIds);

      return {
        list: buildSosEventList(rows, summaryMap, detailMap),
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            page_size: pageSize,
            total: 0,
            total_pages: 0,
          },
        };
      }
      throw err;
    }
  },

  async updateSosEventStatus(eventId, payload = {}) {
    const id = parsePositiveInt(eventId, 'eventId');
    const toStatus = String(payload.status || '').trim();
    const allowedTarget = ['confirmed', 'resolved', 'cancelled'];

    if (!allowedTarget.includes(toStatus)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    const current = await adminOpsModel.getSosEventById(id);
    if (!current) {
      throw createBizError(404, 'SOS event not found.', 404);
    }

    const fromStatus = String(current.event_status || '');
    const allowedFlow = {
      triggered: ['confirmed', 'cancelled'],
      confirmed: ['resolved'],
      resolved: [],
      cancelled: [],
    };

    if (!(allowedFlow[fromStatus] || []).includes(toStatus)) {
      throw createBizError(409, `Cannot transition from ${fromStatus} to ${toStatus}.`, 409);
    }

    const affected = await adminOpsModel.updateSosEventStatus(id, fromStatus, toStatus);
    if (!affected) {
      throw createBizError(409, 'SOS event status changed concurrently, please retry.', 409);
    }

    return {
      event_id: id,
      event_status: toStatus,
    };
  },
};

module.exports = adminIncidentOpsService;
