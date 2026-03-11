'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/smsCode');
  return { model, query: db.query };
};

describe('smsCodeModel', () => {
  it('create inserts a code record and returns insert id', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ insertId: 9 }]);

    await expect(
      model.create({
        phone: '13800000000',
        code: '123456',
        purpose: 'login',
        expiresAt: '2026-03-11 12:30:00',
      })
    ).resolves.toBe(9);
  });

  it('findLatestByPhoneAndPurpose returns the newest row or null', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([
      [
        {
          id: 3,
          phone: '13800000000',
          code: '654321',
          purpose: 'login',
          used: 0,
        },
      ],
    ]);
    await expect(model.findLatestByPhoneAndPurpose('13800000000', 'login')).resolves.toMatchObject({
      id: 3,
      code: '654321',
    });

    query.mockResolvedValueOnce([[]]);
    await expect(model.findLatestByPhoneAndPurpose('13800000000', 'register')).resolves.toBeNull();
  });

  it('markUsed returns whether the code row was consumed', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(model.markUsed(1)).resolves.toBe(true);

    query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(model.markUsed(1)).resolves.toBe(false);
  });

  it('verifyAndConsume rejects missing, used, expired, mismatched, and double-consumed codes', async () => {
    let loaded = loadModel();
    loaded.query.mockResolvedValueOnce([[]]);
    await expect(loaded.model.verifyAndConsume('13800000000', '111111', 'login')).resolves.toEqual({
      valid: false,
      message: '验证码不存在',
    });

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          code: '111111',
          purpose: 'login',
          used: 1,
          expires_at: '2099-01-01 00:00:00',
        },
      ],
    ]);
    await expect(loaded.model.verifyAndConsume('13800000000', '111111', 'login')).resolves.toEqual({
      valid: false,
      message: '验证码已使用',
    });

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([
      [
        {
          id: 2,
          code: '111111',
          purpose: 'login',
          used: 0,
          expires_at: '2000-01-01 00:00:00',
        },
      ],
    ]);
    await expect(loaded.model.verifyAndConsume('13800000000', '111111', 'login')).resolves.toEqual({
      valid: false,
      message: '验证码已过期',
    });

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([
      [
        {
          id: 3,
          code: '111111',
          purpose: 'login',
          used: 0,
          expires_at: '2099-01-01 00:00:00',
        },
      ],
    ]);
    await expect(loaded.model.verifyAndConsume('13800000000', '222222', 'login')).resolves.toEqual({
      valid: false,
      message: '验证码错误',
    });

    loaded = loadModel();
    loaded.query
      .mockResolvedValueOnce([
        [
          {
            id: 4,
            phone: '13800000000',
            code: '123456',
            purpose: 'login',
            used: 0,
            expires_at: '2099-01-01 00:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(loaded.model.verifyAndConsume('13800000000', '123456', 'login')).resolves.toEqual({
      valid: false,
      message: '验证码已使用',
    });
  });

  it('verifyAndConsume marks code used and returns the record when valid', async () => {
    const { model, query } = loadModel();

    query
      .mockResolvedValueOnce([
        [
          {
            id: 8,
            phone: '13800000000',
            code: '888888',
            purpose: 'login',
            used: 0,
            expires_at: '2099-01-01 00:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    await expect(model.verifyAndConsume('13800000000', '888888', 'login')).resolves.toEqual({
      valid: true,
      record: expect.objectContaining({
        id: 8,
        code: '888888',
      }),
    });
  });
});
