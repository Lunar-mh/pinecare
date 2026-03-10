'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const state = {
  nextInteractionId: 1,
  interactions: [],
  contraindications: [],
  users: new Map([
    [
      9009,
      {
        chronic_diseases: JSON.stringify([
          { code: 'D-ULCER', name: '消化性溃疡' },
          { code: 'D-KIDNEY-CKD', name: '慢性肾病' },
        ]),
      },
    ],
  ]),
};

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

const mockDb = {
  query: jest.fn(async (sql, params = []) => {
    const norm = normalizeSql(sql);

    if (
      norm.includes('select level, mechanism, risk_description, suggestion') &&
      norm.includes('from drug_interactions') &&
      norm.includes('limit 1')
    ) {
      const [drugA1, drugB1, drugA2, drugB2] = params;
      const matched = state.interactions
        .filter(
          (item) =>
            (item.drug_a === drugA1 && item.drug_b === drugB1) ||
            (item.drug_a === drugA2 && item.drug_b === drugB2)
        )
        .sort((a, b) => b.id - a.id)[0];

      if (!matched) {
        return [[], []];
      }

      return [
        [
          {
            level: matched.level,
            mechanism: matched.mechanism,
            risk_description: matched.risk_description,
            suggestion: matched.suggestion,
          },
        ],
        [],
      ];
    }

    if (norm.startsWith('insert into drug_interactions')) {
      const chunkSize = 9;
      for (let i = 0; i < params.length; i += chunkSize) {
        const row = {
          id: state.nextInteractionId,
          user_id: Number(params[i]),
          drug_a: params[i + 1],
          drug_b: params[i + 2],
          level: params[i + 3],
          mechanism: params[i + 4],
          risk_description: params[i + 5],
          suggestion: params[i + 6],
          status: params[i + 7],
          check_batch_id: params[i + 8],
          created_at: new Date(),
        };
        state.interactions.push(row);
        state.nextInteractionId += 1;
      }

      return [{ affectedRows: params.length / chunkSize, insertId: state.nextInteractionId - 1 }, []];
    }

    if (norm.includes('from drug_interactions') && norm.includes('where user_id = ? and check_batch_id = ?')) {
      const [userId, batchId] = params;
      const rows = state.interactions
        .filter((item) => Number(item.user_id) === Number(userId) && item.check_batch_id === batchId)
        .sort((a, b) => b.id - a.id);
      return [rows, []];
    }

    if (norm.includes('from drug_interactions') && norm.includes('where user_id = ? and status = ?')) {
      const [userId, status] = params;
      const rows = state.interactions
        .filter((item) => Number(item.user_id) === Number(userId) && item.status === status)
        .sort((a, b) => b.id - a.id);
      return [rows, []];
    }

    if (
      norm.includes('from drug_interactions') &&
      norm.includes('where user_id = ?') &&
      !norm.includes('and status = ?')
    ) {
      const [userId] = params;
      const rows = state.interactions
        .filter((item) => Number(item.user_id) === Number(userId))
        .sort((a, b) => b.id - a.id);
      return [rows, []];
    }

    if (norm.includes('from drug_interactions') && norm.includes('where id = ?') && norm.includes('limit 1')) {
      const [interactionId] = params;
      const found = state.interactions.find((item) => Number(item.id) === Number(interactionId));
      return [found ? [found] : [], []];
    }

    if (norm.startsWith('update drug_interactions set status = ?')) {
      const [status, interactionId] = params;
      const target = state.interactions.find((item) => Number(item.id) === Number(interactionId));
      if (!target) {
        return [{ affectedRows: 0 }, []];
      }

      target.status = status;
      return [{ affectedRows: 1 }, []];
    }

    if (norm.includes('select chronic_diseases') && norm.includes('from users')) {
      const [userId] = params;
      const user = state.users.get(Number(userId));
      return [user ? [user] : [], []];
    }

    if (norm.startsWith('insert into drug_contraindications')) {
      const chunkSize = 6;
      for (let i = 0; i < params.length; i += chunkSize) {
        state.contraindications.push({
          user_id: Number(params[i]),
          drug_name: params[i + 1],
          disease_code: params[i + 2],
          disease_name: params[i + 3],
          severity: params[i + 4],
          description: params[i + 5],
          created_at: new Date(),
        });
      }

      return [{ affectedRows: params.length / chunkSize, insertId: 1 }, []];
    }

    if (norm.includes('from drug_contraindications') && norm.includes('where user_id = ? and drug_name = ?')) {
      const [userId, drugName] = params;
      const rows = state.contraindications.filter(
        (item) => Number(item.user_id) === Number(userId) && item.drug_name === drugName
      );
      return [rows, []];
    }

    if (norm.includes('from drug_food_interactions')) {
      return [[], []];
    }

    throw new Error(`未实现的 SQL: ${norm}`);
  }),
};

jest.mock('../../src/config/database', () => mockDb);

const router = require('../../src/routes/drugInteraction');
const medicationService = require('../../src/services/medicationService');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/drug-interaction', router);
  return app;
}

describe('用药交互集成流程测试', () => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
  const token = jwt.sign({ userId: 9009 }, jwtSecret);

  beforeEach(() => {
    state.nextInteractionId = 1;
    state.interactions = [];
    state.contraindications = [];
  });

  it('自动触发检测 -> 历史查询 -> 风险确认 全流程成功', async () => {
    const app = createApp();
    const authHeader = { Authorization: `Bearer ${token}` };

    const triggerResult = await medicationService.addMedication(9009, {
      drugName: '阿司匹林',
      currentDrugList: ['华法林'],
    });

    expect(triggerResult.riskCount).toBe(1);
    expect(triggerResult.highestRiskLevel).toBe('X');

    const historyRes = await request(app).get('/drug-interaction/history').set(authHeader);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.code).toBe(0);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBe(1);
    expect(historyRes.body.data[0].status).toBe('pending');

    const interactionId = historyRes.body.data[0].id;

    const acknowledgeRes = await request(app)
      .post('/drug-interaction/acknowledge')
      .set(authHeader)
      .send({ interactionId });

    expect(acknowledgeRes.status).toBe(200);
    expect(acknowledgeRes.body.code).toBe(0);
    expect(acknowledgeRes.body.data.status).toBe('acknowledged');

    const acknowledgedHistoryRes = await request(app)
      .get('/drug-interaction/history?status=acknowledged')
      .set(authHeader);

    expect(acknowledgedHistoryRes.status).toBe(200);
    expect(acknowledgedHistoryRes.body.code).toBe(0);
    expect(acknowledgedHistoryRes.body.data.length).toBe(1);
    expect(acknowledgedHistoryRes.body.data[0].status).toBe('acknowledged');
  });
});
