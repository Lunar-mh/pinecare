'use strict';

const TimeBankModel = require('../../models/timeBank');
const credentialService = require('../credentialService');
const { verifyChain } = require('../../utils/hashChain');
const {
  calculateDurationHours,
  calculateTimeCoins,
  createStatusError,
  delCache,
  formatMySQLDateTime,
} = require('./shared');

const serviceRecordService = {
  async recordService(_service, providerId, payload) {
    const recipientId = Number(payload.recipientId);
    if (!recipientId) {
      throw createStatusError('recipientId is required.', 422);
    }

    if (Number(providerId) === recipientId) {
      throw createStatusError('providerId and recipientId must be different.', 422);
    }

    const durationHours = calculateDurationHours(payload);
    const timeCoins = calculateTimeCoins(durationHours);

    let startDate;
    let endDate;

    if (payload.startTime && payload.endTime) {
      startDate = new Date(payload.startTime);
      endDate = new Date(payload.endTime);
    } else {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - durationHours * 60 * 60 * 1000);
    }

    const startTime = formatMySQLDateTime(startDate);
    const endTime = formatMySQLDateTime(endDate);

    const created = await TimeBankModel.createServiceRecord({
      providerId,
      recipientId,
      serviceType: payload.type,
      startTime,
      endTime,
      durationHours,
      timeCoins,
      locationHash: payload.locationHash || null,
    });

    return {
      recordId: created.id,
      recordHash: created.recordHash,
      prevHash: created.prevHash,
      status: created.status,
      startTime,
      endTime,
      durationHours,
      timeCoins,
    };
  },

  async confirmService(_service, userId, payload) {
    const action = payload.action;
    const recordId = Number(payload.recordId);

    if (!recordId || !['confirm', 'cancel'].includes(action)) {
      throw createStatusError('recordId/action is invalid.', 422);
    }

    const record = await TimeBankModel.getServiceRecordById(recordId);
    if (!record) {
      throw createStatusError('Service record not found.', 404);
    }

    if (![Number(record.provider_id), Number(record.recipient_id)].includes(Number(userId))) {
      throw createStatusError('User is not allowed to settle this record.', 403);
    }

    if (record.status !== 'pending') {
      throw createStatusError('Only pending records can be settled.', 409);
    }

    const chainOk = verifyChain(record.record_hash, record.prev_hash, {
      provider_id: record.provider_id,
      recipient_id: record.recipient_id,
      service_type: record.service_type,
      start_time: record.start_time,
      end_time: record.end_time,
      duration_hours: record.duration_hours,
      time_coins: record.time_coins,
      location_hash: record.location_hash,
      status: 'pending',
    });

    if (!chainOk) {
      throw createStatusError('Service record hash verification failed.', 409);
    }

    const baseSignData = {
      recordId: record.id,
      providerId: record.provider_id,
      recipientId: record.recipient_id,
      action,
      timeCoins: record.time_coins,
    };

    const providerSecret = credentialService.createScopedSecret('provider', record.provider_id);
    const recipientSecret = credentialService.createScopedSecret('recipient', record.recipient_id);

    const providerSignature = credentialService.generateSignature(
      { ...baseSignData, role: 'provider' },
      providerSecret
    );

    const recipientSignature = credentialService.generateSignature(
      { ...baseSignData, role: 'recipient' },
      recipientSecret
    );

    const platformSignature = credentialService.generatePlatformSignature(record.id);

    const settled = await TimeBankModel.settleServiceRecord(record.id, action, {
      providerSignature,
      recipientSignature,
      platformSignature,
    });

    await delCache(
      `timebank:account:${record.provider_id}`,
      `timebank:balance:${record.provider_id}`,
      `timebank:account:${record.recipient_id}`,
      `timebank:balance:${record.recipient_id}`
    );

    if (payload.communityId !== undefined && payload.communityId !== null) {
      await delCache(`timebank:leaderboard:${payload.communityId}`);
    }

    return {
      recordId: record.id,
      status: settled.record.status,
      signatures: {
        providerSignature,
        recipientSignature,
        platformSignature,
      },
      account: settled.account,
    };
  },

  async getServiceHistory(_service, userId, type, page, pageSize) {
    const result = await TimeBankModel.listServiceHistory(userId, type, page, pageSize);

    return {
      list: result.list.map((item) => ({
        id: item.id,
        providerId: item.provider_id,
        recipientId: item.recipient_id,
        serviceType: item.service_type,
        startTime: item.start_time,
        endTime: item.end_time,
        durationHours: Number(item.duration_hours),
        timeCoins: item.time_coins,
        status: item.status,
        recordHash: item.record_hash,
        prevHash: item.prev_hash,
        providerSignatureDigest: item.provider_signature
          ? `${String(item.provider_signature).slice(0, 12)}...`
          : null,
        recipientSignatureDigest: item.recipient_signature
          ? `${String(item.recipient_signature).slice(0, 12)}...`
          : null,
        platformSignatureDigest: item.platform_signature
          ? `${String(item.platform_signature).slice(0, 12)}...`
          : null,
        createdAt: item.created_at,
      })),
      pagination: result.pagination,
    };
  },
};

module.exports = serviceRecordService;
