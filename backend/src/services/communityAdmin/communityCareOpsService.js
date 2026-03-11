'use strict';

const adminOpsModel = require('../../models/adminOpsModel');
const adminOpsService = require('../adminOpsService');
const {
  SOS_STATUS_ENUM,
  buildSosNotificationSummaryMap,
  createBizError,
  mapSosEvent,
  normalizePagination,
  requireCommunityScope,
  writeAuditLog,
} = require('./shared');

function delegateToAdminOps(methodName) {
  return async (communityId, query = {}) => {
    requireCommunityScope(communityId);
    return adminOpsService[methodName]({
      ...query,
      communityId,
    });
  };
}

function delegateToAdminOpsWithAudit(methodName, action, detailBuilder) {
  return async (communityId, targetId, body = {}, actor = {}) => {
    requireCommunityScope(communityId);

    const result = await adminOpsService[methodName](targetId, {
      ...body,
      communityId,
    });

    await writeAuditLog(actor, action, detailBuilder(communityId, targetId, result));
    return result;
  };
}

const communityCareOpsService = {
  getHealthOverview: delegateToAdminOps('getHealthOverview'),
  getMedicationLogs: delegateToAdminOps('getMedicationLogs'),
  updateMedicationLogStatus: delegateToAdminOpsWithAudit(
    'updateMedicationLogStatus',
    'community.medication.log_status_update',
    (communityId, logId, result) => ({
      community_id: Number(communityId),
      log_id: Number(logId),
      status_to: result.status,
    })
  ),
  getGpsCurrent: delegateToAdminOps('getGpsCurrent'),
  getGpsTrail: delegateToAdminOps('getGpsTrail'),
  getFamilyBindings: delegateToAdminOps('getFamilyBindings'),
  getMedicalReports: delegateToAdminOps('getMedicalReports'),
  getFallEvents: delegateToAdminOps('getFallEvents'),
  getDrugInteractions: delegateToAdminOps('getDrugInteractions'),
  updateDrugInteractionStatus: delegateToAdminOpsWithAudit(
    'updateDrugInteractionStatus',
    'community.drug_interaction.status_update',
    (communityId, interactionId, result) => ({
      community_id: Number(communityId),
      interaction_id: Number(interactionId),
      status_to: result.status,
    })
  ),
  getTimeBankServiceHistory: delegateToAdminOps('getTimeBankServiceHistory'),
  confirmTimeBankService: async (communityId, body = {}, actor = {}) => {
    requireCommunityScope(communityId);

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
  getTimeBankExchangeHistory: delegateToAdminOps('getTimeBankExchangeHistory'),
  getTimeBankLeaderboard: delegateToAdminOps('getTimeBankLeaderboard'),

  async getSosEvents(communityId, query = {}) {
    requireCommunityScope(communityId);

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
    const summaryMap = buildSosNotificationSummaryMap(summaryRows);

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

  async updateSosEventStatus(communityId, eventId, body = {}, actor = {}) {
    requireCommunityScope(communityId);

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
    const summaryMap = buildSosNotificationSummaryMap(summaryRows);
    return mapSosEvent(latest, summaryMap);
  },
};

module.exports = communityCareOpsService;
