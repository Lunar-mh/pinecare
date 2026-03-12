'use strict';

const loadService = () => {
  jest.resetModules();
  const redis = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };
  const model = {
    getOrCreateAccountByUserId: jest.fn(),
    createServiceRecord: jest.fn(),
    getServiceRecordById: jest.fn(),
    settleServiceRecord: jest.fn(),
    listServiceHistory: jest.fn(),
    createExchangeRecord: jest.fn(),
    listExchangeHistory: jest.fn(),
    getCommunityLeaderboard: jest.fn(),
  };
  const credentialService = {
    createScopedSecret: jest.fn((scope, subjectId) => `scoped-${scope}-${subjectId}`),
    generateSignature: jest.fn((payload, secret) => `${payload.role}-${secret}`),
    generatePlatformSignature: jest.fn((recordId) => `platform-${recordId}`),
  };
  const verifyChain = jest.fn(() => true);

  jest.doMock('../../src/config/redis', () => redis);
  jest.doMock('../../src/models/timeBank', () => model);
  jest.doMock('../../src/services/credentialService', () => credentialService);
  jest.doMock('../../src/utils/hashChain', () => ({ verifyChain }));

  const service = require('../../src/services/timeBankService');
  return { service, redis, model, credentialService, verifyChain };
};

describe('timeBankService', () => {
  it('returns cached account and loads uncached account into redis', async () => {
    let loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(JSON.stringify({ userId: 7, balance: 10 }));
    await expect(loaded.service.getAccount(7)).resolves.toEqual({ userId: 7, balance: 10 });

    loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(null);
    loaded.model.getOrCreateAccountByUserId.mockResolvedValueOnce({
      id: 1,
      user_id: 7,
      balance: 12,
      total_earned: 20,
      total_spent: 3,
      credit_score: 99,
      credit_level: 'angel',
      created_at: 'c',
      updated_at: 'u',
    });

    await expect(loaded.service.getAccount(7)).resolves.toEqual({
      id: 1,
      userId: 7,
      balance: 12,
      totalEarned: 20,
      totalSpent: 3,
      creditScore: 99,
      creditLevel: 'angel',
      createdAt: 'c',
      updatedAt: 'u',
    });
    expect(loaded.redis.set).toHaveBeenCalledTimes(2);
  });

  it('returns cached balance or derives it from account', async () => {
    let loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(JSON.stringify({ balance: 8 }));
    await expect(loaded.service.getBalance(7)).resolves.toEqual({ balance: 8 });

    loaded = loadService();
    loaded.redis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    loaded.model.getOrCreateAccountByUserId.mockResolvedValueOnce({
      id: 1,
      user_id: 7,
      balance: 15,
      total_earned: 20,
      total_spent: 3,
      credit_score: 99,
      credit_level: 'angel',
      created_at: 'c',
      updated_at: 'u',
    });
    await expect(loaded.service.getBalance(7)).resolves.toEqual({ balance: 15 });
  });

  it('validates and records service payloads', async () => {
    let loaded = loadService();
    await expect(loaded.service.recordService(7, {})).rejects.toMatchObject({ statusCode: 422 });
    await expect(loaded.service.recordService(7, { recipientId: 7, duration: 1 })).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      loaded.service.recordService(7, { startTime: '2026-03-11T10:00:00Z', endTime: '2026-03-11T09:00:00Z', recipientId: 8 })
    ).rejects.toMatchObject({ statusCode: 422 });

    loaded = loadService();
    loaded.model.createServiceRecord.mockResolvedValueOnce({
      id: 5,
      recordHash: 'hash-5',
      prevHash: 'hash-4',
      status: 'pending',
    });
    await expect(
      loaded.service.recordService(7, {
        recipientId: 8,
        type: 'escort',
        startTime: '2026-03-11T09:00:00Z',
        endTime: '2026-03-11T10:00:00Z',
        locationHash: 'loc',
      })
    ).resolves.toMatchObject({
      recordId: 5,
      recordHash: 'hash-5',
      prevHash: 'hash-4',
      durationHours: 1,
      timeCoins: 1,
    });
  });

  it('validates confirmation state machine and settles confirmed records', async () => {
    let loaded = loadService();
    await expect(loaded.service.confirmService(7, { recordId: 0, action: 'approve' })).rejects.toMatchObject({ statusCode: 422 });

    loaded = loadService();
    loaded.model.getServiceRecordById.mockResolvedValueOnce(null);
    await expect(loaded.service.confirmService(7, { recordId: 5, action: 'confirm' })).rejects.toMatchObject({ statusCode: 404 });

    loaded = loadService();
    loaded.model.getServiceRecordById.mockResolvedValueOnce({ id: 5, provider_id: 8, recipient_id: 9, status: 'pending' });
    await expect(loaded.service.confirmService(7, { recordId: 5, action: 'confirm' })).rejects.toMatchObject({ statusCode: 403 });

    loaded = loadService();
    loaded.model.getServiceRecordById.mockResolvedValueOnce({ id: 5, provider_id: 7, recipient_id: 9, status: 'confirmed' });
    await expect(loaded.service.confirmService(7, { recordId: 5, action: 'confirm' })).rejects.toMatchObject({ statusCode: 409 });

    loaded = loadService();
    loaded.model.getServiceRecordById.mockResolvedValueOnce({
      id: 5,
      provider_id: 7,
      recipient_id: 9,
      service_type: 'escort',
      start_time: '2026-03-11 09:00:00',
      end_time: '2026-03-11 10:00:00',
      duration_hours: 1,
      time_coins: 2,
      location_hash: 'loc',
      record_hash: 'hash-5',
      prev_hash: 'hash-4',
      status: 'pending',
    });
    loaded.verifyChain.mockReturnValueOnce(false);
    await expect(loaded.service.confirmService(7, { recordId: 5, action: 'confirm' })).rejects.toMatchObject({ statusCode: 409 });

    loaded = loadService();
    loaded.model.getServiceRecordById.mockResolvedValueOnce({
      id: 5,
      provider_id: 7,
      recipient_id: 9,
      service_type: 'escort',
      start_time: '2026-03-11 09:00:00',
      end_time: '2026-03-11 10:00:00',
      duration_hours: 1,
      time_coins: 2,
      location_hash: 'loc',
      record_hash: 'hash-5',
      prev_hash: 'hash-4',
      status: 'pending',
    });
    loaded.model.settleServiceRecord.mockResolvedValueOnce({
      record: { status: 'confirmed' },
      account: { balance: 12 },
    });

    await expect(
      loaded.service.confirmService(7, { recordId: 5, action: 'confirm', communityId: 9 })
    ).resolves.toEqual({
      recordId: 5,
      status: 'confirmed',
      signatures: {
        providerSignature: 'provider-scoped-provider-7',
        recipientSignature: 'recipient-scoped-recipient-9',
        platformSignature: 'platform-5',
      },
      account: { balance: 12 },
    });
    expect(loaded.credentialService.createScopedSecret).toHaveBeenNthCalledWith(1, 'provider', 7);
    expect(loaded.credentialService.createScopedSecret).toHaveBeenNthCalledWith(2, 'recipient', 9);
    expect(loaded.redis.del).toHaveBeenCalledWith([
      'timebank:account:7',
      'timebank:balance:7',
      'timebank:account:9',
      'timebank:balance:9',
    ]);
    expect(loaded.redis.del).toHaveBeenCalledWith(['timebank:leaderboard:9']);
  });

  it('maps service history, exchanges, and leaderboard data', async () => {
    let loaded = loadService();
    loaded.model.listServiceHistory.mockResolvedValueOnce({
      list: [
        {
          id: 5,
          provider_id: 7,
          recipient_id: 9,
          service_type: 'escort',
          start_time: 's',
          end_time: 'e',
          duration_hours: '1',
          time_coins: 2,
          status: 'pending',
          record_hash: 'hash',
          prev_hash: 'prev',
          provider_signature: 'provider-signature-long',
          recipient_signature: 'recipient-signature-long',
          platform_signature: 'platform-signature-long',
          created_at: 'c',
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    await expect(loaded.service.getServiceHistory(7, 'provided', 1, 10)).resolves.toEqual({
      list: [
        {
          id: 5,
          providerId: 7,
          recipientId: 9,
          serviceType: 'escort',
          startTime: 's',
          endTime: 'e',
          durationHours: 1,
          timeCoins: 2,
          status: 'pending',
          recordHash: 'hash',
          prevHash: 'prev',
          providerSignatureDigest: 'provider-sig...',
          recipientSignatureDigest: 'recipient-si...',
          platformSignatureDigest: 'platform-sig...',
          createdAt: 'c',
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    loaded = loadService();
    await expect(loaded.service.createExchange(7, { coinsRequired: 0 })).rejects.toMatchObject({ statusCode: 422 });

    loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(null);
    loaded.model.getOrCreateAccountByUserId.mockResolvedValueOnce({
      id: 1,
      user_id: 7,
      balance: 1,
      total_earned: 5,
      total_spent: 0,
      credit_score: 80,
      credit_level: 'gold',
      created_at: 'c',
      updated_at: 'u',
    });
    await expect(loaded.service.createExchange(7, { coinsRequired: 5 })).rejects.toMatchObject({ statusCode: 409 });

    loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(null);
    loaded.model.getOrCreateAccountByUserId.mockResolvedValueOnce({
      id: 1,
      user_id: 7,
      balance: 10,
      total_earned: 5,
      total_spent: 0,
      credit_score: 80,
      credit_level: 'gold',
      created_at: 'c',
      updated_at: 'u',
    });
    loaded.model.createExchangeRecord.mockResolvedValueOnce({ id: 9, status: 'completed' });
    await expect(
      loaded.service.createExchange(7, { exchangeType: 'gift', itemName: 'Coupon', coinsRequired: 5, communityId: 9 })
    ).resolves.toEqual({ id: 9, status: 'completed' });

    loaded = loadService();
    loaded.model.listExchangeHistory.mockResolvedValueOnce([
      {
        id: 1,
        user_id: 7,
        exchange_type: 'gift',
        item_name: 'Coupon',
        coins_required: 5,
        status: 'completed',
        created_at: 'c',
        completed_at: 'd',
      },
    ]);
    await expect(loaded.service.getExchangeHistory(7)).resolves.toEqual([
      {
        id: 1,
        userId: 7,
        exchangeType: 'gift',
        itemName: 'Coupon',
        coinsRequired: 5,
        status: 'completed',
        createdAt: 'c',
        completedAt: 'd',
      },
    ]);

    loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(JSON.stringify([{ rank: 1 }]));
    await expect(loaded.service.getLeaderboard(9)).resolves.toEqual([{ rank: 1 }]);

    loaded = loadService();
    loaded.redis.get.mockResolvedValueOnce(null);
    loaded.model.getCommunityLeaderboard.mockResolvedValueOnce([
      { user_id: 7, balance: 5, total_earned: 10, credit_score: 80, credit_level: 'gold' },
    ]);
    await expect(loaded.service.getLeaderboard(9)).resolves.toEqual([
      { rank: 1, userId: 7, balance: 5, totalEarned: 10, creditScore: 80, creditLevel: 'gold' },
    ]);
  });
});
