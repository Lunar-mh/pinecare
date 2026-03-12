'use strict';

jest.mock('../../src/services/timeBankService', () => ({
  getAccount: jest.fn(),
  getBalance: jest.fn(),
  recordService: jest.fn(),
  confirmService: jest.fn(),
  getServiceHistory: jest.fn(),
  createExchange: jest.fn(),
  getExchangeHistory: jest.fn(),
  getLeaderboard: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const timeBankService = require('../../src/services/timeBankService');
const timeBankController = require('../../src/controllers/timeBankController');

function createRes() {
  return {
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
}

describe('timeBankController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads account and balance through the service layer', async () => {
    timeBankService.getAccount.mockResolvedValueOnce({ id: 1, balance: 8 });
    timeBankService.getBalance.mockResolvedValueOnce({ balance: 8 });

    const accountRes = createRes();
    await timeBankController.getAccount({ user: { userId: 7 } }, accountRes);
    expect(accountRes.body).toEqual({ code: 0, message: 'Time bank account loaded.', data: { id: 1, balance: 8 } });

    const balanceRes = createRes();
    await timeBankController.getBalance({ user: { userId: 7 } }, balanceRes);
    expect(balanceRes.body).toEqual({ code: 0, message: 'Time bank balance loaded.', data: { balance: 8 } });
  });

  it('records service payloads after route normalization', async () => {
    timeBankService.recordService.mockResolvedValue({ recordId: 88, timeCoins: 2 });
    const res = createRes();

    await timeBankController.recordService(
      {
        user: { userId: 7 },
        body: {
          recipientId: 9,
          type: 'home_visit',
          duration: 1,
          locationHash: 'abc',
        },
      },
      res
    );

    expect(timeBankService.recordService).toHaveBeenCalledWith(7, {
      recipientId: 9,
      type: 'home_visit',
      duration: 1,
      locationHash: 'abc',
    });
    expect(res.body.code).toBe(0);
  });

  it('maps coded errors for settlement requests', async () => {
    const error = new Error('Service record not found.');
    error.code = 404;
    error.statusCode = 404;
    timeBankService.confirmService.mockRejectedValue(error);
    const res = createRes();

    await timeBankController.confirmService(
      { user: { userId: 7 }, body: { recordId: 88, action: 'confirm' } },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Service record not found.');
  });

  it('uses default messages for uncoded history errors', async () => {
    timeBankService.getServiceHistory.mockRejectedValue(new Error('boom'));
    const res = createRes();

    await timeBankController.getServiceHistory(
      { user: { userId: 7 }, query: { type: 'provided', page: 1, pageSize: 10 } },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Failed to load time bank history.');
  });

  it('passes normalized leaderboard community id through to service', async () => {
    timeBankService.getLeaderboard.mockResolvedValue([{ rank: 1 }]);
    const res = createRes();

    await timeBankController.getLeaderboard({ user: { userId: 7 }, query: { communityId: 3 } }, res);

    expect(timeBankService.getLeaderboard).toHaveBeenCalledWith(3);
    expect(res.body.code).toBe(0);
  });

  it('loads exchange history and creates exchanges', async () => {
    timeBankService.getExchangeHistory.mockResolvedValueOnce([{ id: 1 }]);
    timeBankService.createExchange.mockResolvedValueOnce({ id: 9, status: 'pending' });

    const historyRes = createRes();
    await timeBankController.getExchangeHistory({ user: { userId: 7 } }, historyRes);
    expect(historyRes.body.code).toBe(0);

    const createResObj = createRes();
    await timeBankController.createExchange(
      {
        user: { userId: 7 },
        body: { exchangeType: 'goods', itemName: 'Rice', coinsRequired: 5 },
      },
      createResObj
    );

    expect(createResObj.body.code).toBe(0);
    expect(timeBankService.createExchange).toHaveBeenCalledWith(7, {
      exchangeType: 'goods',
      itemName: 'Rice',
      coinsRequired: 5,
    });
  });
});
