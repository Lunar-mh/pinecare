'use strict';

const createConnection = () => ({
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  execute: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
});

const loadModel = () => {
  jest.resetModules();
  const query = jest.fn();
  const conn = createConnection();
  const pool = {
    getConnection: jest.fn().mockResolvedValue(conn),
  };
  const generateRecordHash = jest.fn(() => 'record-hash-2');

  jest.doMock('../../src/config/database', () => ({
    query,
    pool,
  }));
  jest.doMock('../../src/utils/hashChain', () => ({
    generateRecordHash,
  }));

  const model = require('../../src/models/timeBank');
  return { model, query, pool, conn, generateRecordHash };
};

describe('timeBankModel', () => {
  it('gets or creates accounts and reads latest record hash', async () => {
    const { model, query } = loadModel();

    await expect(model.getOrCreateAccountByUserId(0)).rejects.toThrow();

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, user_id: 7, balance: 10, total_earned: 20, total_spent: 5, credit_score: 99, credit_level: 'angel', created_at: 'c', updated_at: 'u' }]])
      .mockResolvedValueOnce([[]]);

    await expect(model.getOrCreateAccountByUserId(7)).resolves.toMatchObject({ id: 1, user_id: 7 });
    await expect(model.getLatestRecordHash()).resolves.toBe('0'.repeat(64));
  });

  it('creates and updates service records', async () => {
    const { model, query, generateRecordHash } = loadModel();
    query
      .mockResolvedValueOnce([[{ record_hash: 'prev-hash' }]])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([[{ id: 11 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const created = await model.createServiceRecord({
      providerId: 7,
      recipientId: 8,
      serviceType: 'escort',
      startTime: '2026-03-11 09:00:00',
      endTime: '2026-03-11 10:00:00',
      durationHours: 1,
      timeCoins: 1,
      locationHash: 'loc',
    });

    expect(generateRecordHash).toHaveBeenCalledWith(
      expect.objectContaining({ prev_hash: 'prev-hash', provider_id: 7, recipient_id: 8 })
    );
    expect(created).toMatchObject({ id: 11, recordHash: 'record-hash-2', prevHash: 'prev-hash' });
    await expect(model.getServiceRecordById(11)).resolves.toEqual({ id: 11 });
    await expect(
      model.updateServiceRecordStatus(11, 'confirmed', {
        providerSignature: 'p',
        recipientSignature: 'r',
        platformSignature: 'x',
      })
    ).resolves.toBe(true);
  });

  it('settles service records for confirm, cancel, and not-found paths', async () => {
    let loaded = loadModel();
    loaded.conn.execute.mockResolvedValueOnce([[]]);
    await expect(loaded.model.settleServiceRecord(1, 'confirm')).rejects.toMatchObject({ statusCode: 404 });
    expect(loaded.conn.rollback).toHaveBeenCalledTimes(1);
    expect(loaded.conn.release).toHaveBeenCalledTimes(1);

    loaded = loadModel();
    loaded.conn.execute
      .mockResolvedValueOnce([[{ id: 5, provider_id: 7, recipient_id: 8, time_coins: 2, status: 'pending' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 10, total_earned: 20, total_spent: 3, credit_score: 94 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(
      loaded.model.settleServiceRecord(5, 'confirm', { providerSignature: 'p', recipientSignature: 'r', platformSignature: 'x' })
    ).resolves.toEqual({
      record: {
        id: 5,
        providerId: 7,
        recipientId: 8,
        timeCoins: 2,
        status: 'confirmed',
      },
      account: {
        userId: 7,
        balance: 12,
        totalEarned: 22,
        totalSpent: 3,
        creditScore: 95,
        creditLevel: 'angel',
      },
    });
    expect(loaded.conn.commit).toHaveBeenCalledTimes(1);

    loaded = loadModel();
    loaded.conn.execute
      .mockResolvedValueOnce([[{ id: 6, provider_id: 7, recipient_id: 8, time_coins: 2, status: 'pending' }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(loaded.model.settleServiceRecord(6, 'cancel')).resolves.toEqual({
      record: {
        id: 6,
        providerId: 7,
        recipientId: 8,
        timeCoins: 2,
        status: 'cancelled',
      },
      account: null,
    });
  });

  it('updates account balances and validates spend constraints', async () => {
    let loaded = loadModel();
    await expect(loaded.model.updateAccountBalance(0, 2, 'earn')).rejects.toThrow();

    loaded = loadModel();
    loaded.conn.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, user_id: 7, balance: 10, total_earned: 20, total_spent: 5, credit_score: 79 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(loaded.model.updateAccountBalance(7, 2, 'earn')).resolves.toEqual({
      userId: 7,
      balance: 12,
      totalEarned: 22,
      totalSpent: 5,
      creditScore: 80,
      creditLevel: 'gold',
    });

    loaded = loadModel();
    loaded.conn.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, user_id: 7, balance: 1, total_earned: 20, total_spent: 5, credit_score: 79 }]]);
    await expect(loaded.model.updateAccountBalance(7, 2, 'spend')).rejects.toMatchObject({ statusCode: 409 });
    expect(loaded.conn.rollback).toHaveBeenCalledTimes(1);
  });

  it('lists history, exchange records, and leaderboard fallbacks', async () => {
    let loaded = loadModel();
    loaded.query
      .mockResolvedValueOnce([[{ total: 5 }]])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ id: 2 }]])
      .mockResolvedValueOnce([[{ id: 3 }]]);

    await expect(loaded.model.listServiceHistory(7, 'received', 2, 3)).resolves.toEqual({
      list: [{ id: 1 }],
      pagination: { page: 2, pageSize: 3, total: 5, totalPages: 2 },
    });
    await expect(loaded.model.listExchangeHistory(7)).resolves.toEqual([{ id: 2 }]);
    await expect(loaded.model.listExchangeHistoryByUser(7)).resolves.toEqual([{ id: 3 }]);

    loaded = loadModel();
    loaded.conn.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 1 }]]);
    await expect(
      loaded.model.createExchangeRecord(7, { exchangeType: 'gift', itemName: 'Coupon', coinsRequired: 5 })
    ).rejects.toMatchObject({ statusCode: 409 });

    loaded = loadModel();
    loaded.conn.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ balance: 10 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 9 }]);
    await expect(
      loaded.model.createExchangeRecord(7, { exchangeType: 'gift', itemName: 'Coupon', coinsRequired: 5 })
    ).resolves.toEqual({
      id: 9,
      userId: 7,
      exchangeType: 'gift',
      itemName: 'Coupon',
      coinsRequired: 5,
      status: 'completed',
    });

    loaded = loadModel();
    loaded.query.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ER_NO_SUCH_TABLE' }));
    loaded.query.mockResolvedValueOnce([[{ user_id: 7 }]]);
    await expect(loaded.model.getCommunityLeaderboard(9)).resolves.toEqual([{ user_id: 7 }]);

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([[{ user_id: 8 }]]);
    await expect(loaded.model.getCommunityLeaderboard(null)).resolves.toEqual([{ user_id: 8 }]);
  });
});
