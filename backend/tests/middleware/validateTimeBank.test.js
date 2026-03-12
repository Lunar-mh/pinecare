'use strict';

const {
  validateConfirmService,
  validateExchangeCreate,
  validateLeaderboardQuery,
  validateRecordService,
  validateServiceHistoryQuery,
} = require('../../src/middleware/validateTimeBank');

function run(middleware, req = {}) {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
}

describe('validateTimeBank middleware', () => {
  it('validates record service payloads', () => {
    let result = run(validateRecordService, { body: { type: 'visit' } });
    expect(result.res.body.message).toBe('recipientId is required.');

    const req = {
      body: { recipientId: '9', type: ' visit ', duration: 1, locationHash: ' abc ' },
    };
    result = run(validateRecordService, req);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.body.recipientId).toBe(9);
    expect(req.body.type).toBe('visit');
    expect(req.body.locationHash).toBe('abc');
  });

  it('validates settlement payloads and history queries', () => {
    let result = run(validateConfirmService, { body: { recordId: '8', action: 'confirm', communityId: '3' } });
    expect(result.next).toHaveBeenCalledTimes(1);

    const historyReq = { query: { type: 'received', page: '2', pageSize: '30' } };
    result = run(validateServiceHistoryQuery, historyReq);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(historyReq.query.page).toBe(2);
    expect(historyReq.query.pageSize).toBe(30);
    expect(historyReq.query.type).toBe('received');

    result = run(validateServiceHistoryQuery, { query: { type: 'bad' } });
    expect(result.res.body.message).toBe('type must be one of provided/received.');
  });

  it('validates exchange payloads and leaderboard filters', () => {
    let result = run(validateExchangeCreate, {
      body: { exchangeType: 'goods', itemName: ' Rice ', coinsRequired: '5', communityId: '4' },
    });
    expect(result.next).toHaveBeenCalledTimes(1);

    const leaderboardReq = { query: { communityId: '6' } };
    result = run(validateLeaderboardQuery, leaderboardReq);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(leaderboardReq.query.communityId).toBe(6);

    result = run(validateLeaderboardQuery, { query: { communityId: 'bad' } });
    expect(result.res.body.message).toBe('communityId must be a positive integer.');
  });
});
