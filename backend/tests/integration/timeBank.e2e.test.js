'use strict';

const jwt = require('jsonwebtoken');
const request = require('supertest');

const state = {
  accounts: new Map(),
  serviceRecords: [],
  exchangeRecords: [],
  nextServiceId: 1,
  nextExchangeId: 1,
};

function ensureAccount(userId) {
  if (!state.accounts.has(userId)) {
    state.accounts.set(userId, {
      id: state.accounts.size + 1,
      user_id: userId,
      balance: 0,
      total_earned: 0,
      total_spent: 0,
      credit_score: 100,
      credit_level: 'angel',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  return state.accounts.get(userId);
}

function getCreditLevel(score) {
  if (score >= 95) return 'angel';
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  return 'new';
}

const mockDb = {
  query: jest.fn(async (sql, params = []) => {
    const norm = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    if (norm.startsWith('insert into time_accounts') && norm.includes('on duplicate key update')) {
      const userId = Number(params[0]);
      ensureAccount(userId);
      return [{ affectedRows: 1, insertId: 0 }, []];
    }

    if (norm.includes('from time_accounts') && norm.includes('where user_id = ?') && norm.includes('limit 1')) {
      const userId = Number(params[0]);
      return [[ensureAccount(userId)], []];
    }

    if (norm.includes('select record_hash') && norm.includes('from service_records')) {
      const last = state.serviceRecords[state.serviceRecords.length - 1];
      return [[last ? { record_hash: last.record_hash } : undefined].filter(Boolean), []];
    }

    if (norm.startsWith('insert into service_records')) {
      const [recordHash, prevHash, providerId, recipientId, serviceType, startTime, endTime, durationHours, timeCoins, locationHash] = params;
      const row = {
        id: state.nextServiceId++,
        record_hash: recordHash,
        prev_hash: prevHash,
        provider_id: Number(providerId),
        recipient_id: Number(recipientId),
        service_type: serviceType,
        start_time: startTime,
        end_time: endTime,
        duration_hours: Number(durationHours),
        time_coins: Number(timeCoins),
        location_hash: locationHash,
        status: 'pending',
        provider_signature: null,
        recipient_signature: null,
        platform_signature: null,
        created_at: new Date(),
      };
      state.serviceRecords.push(row);
      return [{ affectedRows: 1, insertId: row.id }, []];
    }

    if (norm.includes('from service_records') && norm.includes('where id = ?') && norm.includes('limit 1')) {
      const id = Number(params[0]);
      const row = state.serviceRecords.find((item) => item.id === id);
      return [row ? [row] : [], []];
    }

    if (norm.includes('select count(1) as total from service_records where provider_id = ?')) {
      const userId = Number(params[0]);
      const total = state.serviceRecords.filter((item) => item.provider_id === userId).length;
      return [[{ total }], []];
    }

    if (norm.includes('select count(1) as total from service_records where recipient_id = ?')) {
      const userId = Number(params[0]);
      const total = state.serviceRecords.filter((item) => item.recipient_id === userId).length;
      return [[{ total }], []];
    }

    if (norm.includes('from service_records') && norm.includes('where provider_id = ?') && norm.includes('limit ? offset ?')) {
      const [userId, limit, offset] = params.map(Number);
      const list = state.serviceRecords
        .filter((item) => item.provider_id === userId)
        .sort((a, b) => b.id - a.id)
        .slice(offset, offset + limit);
      return [list, []];
    }

    if (norm.includes('from service_records') && norm.includes('where recipient_id = ?') && norm.includes('limit ? offset ?')) {
      const [userId, limit, offset] = params.map(Number);
      const list = state.serviceRecords
        .filter((item) => item.recipient_id === userId)
        .sort((a, b) => b.id - a.id)
        .slice(offset, offset + limit);
      return [list, []];
    }

    if (norm.includes('from exchange_records') && norm.includes('where user_id = ?')) {
      const userId = Number(params[0]);
      const list = state.exchangeRecords
        .filter((item) => item.user_id === userId)
        .sort((a, b) => b.id - a.id);
      return [list, []];
    }

    if (norm.includes('from time_accounts ta inner join users u')) {
      const err = new Error('users table not found');
      err.code = 'ER_NO_SUCH_TABLE';
      throw err;
    }

    if (norm.includes('select user_id, balance, total_earned, credit_score, credit_level from time_accounts')) {
      const list = Array.from(state.accounts.values())
        .sort((a, b) => b.balance - a.balance || b.total_earned - a.total_earned)
        .map((item) => ({
          user_id: item.user_id,
          balance: item.balance,
          total_earned: item.total_earned,
          credit_score: item.credit_score,
          credit_level: item.credit_level,
        }));
      return [list, []];
    }

    throw new Error(`Unimplemented query SQL: ${norm}`);
  }),
  pool: {
    getConnection: jest.fn(async () => ({
      beginTransaction: jest.fn(async () => {}),
      commit: jest.fn(async () => {}),
      rollback: jest.fn(async () => {}),
      release: jest.fn(() => {}),
      execute: jest.fn(async (sql, params = []) => {
        const norm = sql.replace(/\s+/g, ' ').trim().toLowerCase();

        if (norm.includes('select id, provider_id, recipient_id, time_coins, status from service_records')) {
          const id = Number(params[0]);
          const row = state.serviceRecords.find((item) => item.id === id);
          return [row ? [row] : [], []];
        }

        if (norm.startsWith('update service_records set status = ?')) {
          const [status, providerSig, recipientSig, platformSig, recordId] = params;
          const row = state.serviceRecords.find((item) => item.id === Number(recordId));
          if (!row) return [{ affectedRows: 0 }, []];
          row.status = status;
          row.provider_signature = providerSig;
          row.recipient_signature = recipientSig;
          row.platform_signature = platformSig;
          return [{ affectedRows: 1 }, []];
        }

        if (norm.startsWith('insert into time_accounts') && norm.includes('on duplicate key update')) {
          ensureAccount(Number(params[0]));
          return [{ affectedRows: 1 }, []];
        }

        if (norm.includes('select balance, total_earned, total_spent, credit_score from time_accounts')) {
          const userId = Number(params[0]);
          return [[ensureAccount(userId)], []];
        }

        if (norm.startsWith('update time_accounts set balance = ?, total_earned = ?')) {
          const [balance, totalEarned, totalSpent, creditScore, creditLevel, userId] = params;
          const account = ensureAccount(Number(userId));
          account.balance = Number(balance);
          account.total_earned = Number(totalEarned);
          account.total_spent = Number(totalSpent);
          account.credit_score = Number(creditScore);
          account.credit_level = creditLevel;
          account.updated_at = new Date();
          return [{ affectedRows: 1 }, []];
        }

        if (norm.includes('select balance from time_accounts') && norm.includes('for update')) {
          const userId = Number(params[0]);
          return [[{ balance: ensureAccount(userId).balance }], []];
        }

        if (norm.startsWith('update time_accounts set balance = balance - ?')) {
          const [coins, spentCoins, userId] = params.map(Number);
          const account = ensureAccount(userId);
          account.balance -= coins;
          account.total_spent += spentCoins;
          account.credit_score = Math.max(0, account.credit_score - 1);
          account.credit_level = getCreditLevel(account.credit_score);
          account.updated_at = new Date();
          return [{ affectedRows: 1 }, []];
        }

        if (norm.startsWith('insert into exchange_records')) {
          const [userId, exchangeType, itemName, coinsRequired] = params;
          const row = {
            id: state.nextExchangeId++,
            user_id: Number(userId),
            exchange_type: exchangeType,
            item_name: itemName,
            coins_required: Number(coinsRequired),
            status: 'completed',
            created_at: new Date(),
            completed_at: new Date(),
          };
          state.exchangeRecords.push(row);
          return [{ affectedRows: 1, insertId: row.id }, []];
        }

        throw new Error(`Unimplemented execute SQL: ${norm}`);
      }),
    })),
  },
};

jest.mock('../../src/config/database', () => mockDb);

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(async () => null),
  set: jest.fn(async () => 'OK'),
  del: jest.fn(async () => 1),
}));

process.env.HASH_SECRET = process.env.HASH_SECRET || 'integration-hash-secret';
process.env.PLATFORM_PRIVATE_KEY = process.env.PLATFORM_PRIVATE_KEY || 'integration-platform-secret';

const app = require('../../src/app');

describe('timeBank integration flow', () => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
  const token = jwt.sign({ userId: 1001 }, jwtSecret);

  it('account -> record -> confirm -> exchange -> history works end-to-end', async () => {
    const authHeader = { Authorization: `Bearer ${token}` };

    const accountRes = await request(app).get('/time-bank/account').set(authHeader);
    expect(accountRes.status).toBe(200);
    expect(accountRes.body.code).toBe(0);
    expect(accountRes.body.data.userId).toBe(1001);
    expect(accountRes.body.data.balance).toBe(0);

    const recordRes = await request(app)
      .post('/time-bank/service/record')
      .set(authHeader)
      .send({
        recipientId: 2001,
        type: 'companionship',
        duration: 1.5,
        locationHash: 'abc123',
      });

    expect(recordRes.status).toBe(200);
    expect(recordRes.body.code).toBe(0);
    expect(recordRes.body.data.recordId).toBeGreaterThan(0);
    expect(recordRes.body.data.status).toBe('pending');
    const recordId = recordRes.body.data.recordId;

    const confirmRes = await request(app)
      .post('/time-bank/service/confirm')
      .set(authHeader)
      .send({
        recordId,
        action: 'confirm',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.code).toBe(0);
    expect(confirmRes.body.data.status).toBe('confirmed');
    expect(confirmRes.body.data.account.balance).toBe(2);

    const exchangeRes = await request(app)
      .post('/time-bank/exchange')
      .set(authHeader)
      .send({
        exchangeType: 'service',
        itemName: 'community haircut',
        coinsRequired: 1,
      });

    expect(exchangeRes.status).toBe(200);
    expect(exchangeRes.body.code).toBe(0);
    expect(exchangeRes.body.data.status).toBe('completed');

    const balanceRes = await request(app).get('/time-bank/balance').set(authHeader);
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.code).toBe(0);
    expect(balanceRes.body.data.balance).toBe(1);

    const serviceHistoryRes = await request(app)
      .get('/time-bank/service/history?type=provided&page=1&pageSize=10')
      .set(authHeader);

    expect(serviceHistoryRes.status).toBe(200);
    expect(serviceHistoryRes.body.code).toBe(0);
    expect(Array.isArray(serviceHistoryRes.body.data.list)).toBe(true);
    expect(serviceHistoryRes.body.data.list.length).toBeGreaterThan(0);
    expect(serviceHistoryRes.body.data.list[0].status).toBe('confirmed');

    const exchangeHistoryRes = await request(app).get('/time-bank/exchange/history').set(authHeader);
    expect(exchangeHistoryRes.status).toBe(200);
    expect(exchangeHistoryRes.body.code).toBe(0);
    expect(Array.isArray(exchangeHistoryRes.body.data)).toBe(true);
    expect(exchangeHistoryRes.body.data.length).toBe(1);

    const leaderboardRes = await request(app).get('/time-bank/leaderboard').set(authHeader);
    expect(leaderboardRes.status).toBe(200);
    expect(leaderboardRes.body.code).toBe(0);
    expect(Array.isArray(leaderboardRes.body.data)).toBe(true);
    expect(leaderboardRes.body.data[0].userId).toBe(1001);
  });
});
