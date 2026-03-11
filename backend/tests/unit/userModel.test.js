'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/user');
  return { model, query: db.query };
};

describe('userModel', () => {
  it('normalizes chronic diseases when finding users', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ id: 1, chronic_diseases: '["a","b"]' }]])
      .mockResolvedValueOnce([[{ id: 2, chronic_diseases: 'bad-json' }]])
      .mockResolvedValueOnce([[{ id: 3, chronic_diseases: 'single' }]]);

    await expect(model.findById(1)).resolves.toMatchObject({ chronic_diseases: ['a', 'b'] });
    await expect(model.findByPhone('138')).resolves.toMatchObject({ chronic_diseases: [] });
    await expect(model.findByOpenid('openid')).resolves.toMatchObject({ chronic_diseases: [] });
  });

  it('creates users via phone and wechat then reloads them', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([[{ id: 10 }]])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([[{ id: 11 }]]);

    await expect(model.createWithPhone({ phone: '13800000000', passwordHash: 'hash' })).resolves.toMatchObject({
      id: 10,
      chronic_diseases: [],
    });
    await expect(
      model.createWithWechat({ openid: 'openid-1', nickname: 'nick', avatarUrl: 'avatar' })
    ).resolves.toMatchObject({ id: 11, chronic_diseases: [] });
  });

  it('updates wechat profile only for provided fields', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 1, nickname: 'new' }]]);

    await expect(model.updateWechatProfile(1, {})).resolves.toMatchObject({ id: 1, nickname: 'new' });

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, nickname: 'new', avatar_url: 'x' }]]);

    await expect(model.updateWechatProfile(1, { nickname: 'new', avatarUrl: 'x' })).resolves.toMatchObject({
      id: 1,
      nickname: 'new',
      avatar_url: 'x',
      chronic_diseases: [],
    });
  });

  it('tracks login attempts and locking helpers', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(model.markLoginSuccess(1)).resolves.toBeUndefined();

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, failed_login_attempts: 2 }]]);
    await expect(model.incrementFailedLoginAttempts(1)).resolves.toMatchObject({
      id: 1,
      failed_login_attempts: 2,
      chronic_diseases: [],
    });

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, account_status: 'locked' }]]);
    await expect(model.setAccountLock(1, '2026-03-11 10:00:00', 5)).resolves.toMatchObject({
      id: 1,
      account_status: 'locked',
      chronic_diseases: [],
    });

    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(model.clearFailedAttempts(1)).resolves.toBeUndefined();
  });

  it('unlocks, deletes, and updates user profiles', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 3, phone: '138' }]]);
    await expect(model.unlockByPhone('138')).resolves.toMatchObject({ id: 3, phone: '138' });

    query.mockResolvedValueOnce([{ affectedRows: 2 }]);
    await expect(model.softDelete(3)).resolves.toBe(2);

    query.mockResolvedValueOnce([[{ id: 3, chronic_diseases: [] }]]);
    await expect(model.getProfileById(3)).resolves.toEqual({ id: 3, chronic_diseases: [] });

    query.mockResolvedValueOnce([[{ id: 3, chronic_diseases: [] }]]);
    await expect(model.updateProfile(3, {})).resolves.toEqual({ id: 3, chronic_diseases: [] });

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 3, chronic_diseases: ['a'] }]]);
    await expect(
      model.updateProfile(3, {
        real_name: 'Alice',
        age: 72,
        gender: 'female',
        chronic_diseases: ['a'],
      })
    ).resolves.toEqual({ id: 3, chronic_diseases: ['a'] });
  });
});
