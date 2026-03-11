'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/emergencyContact');
  return { model, query: db.query };
};

describe('emergencyContactModel', () => {
  it('lists, counts, and finds contacts', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 1 }]]);
    query.mockResolvedValueOnce([[{ total: 4 }]]);
    query.mockResolvedValueOnce([[{ id: 2 }]]);

    await expect(model.listByUserId(1)).resolves.toEqual([{ id: 1 }]);
    await expect(model.countByUserId(1)).resolves.toBe(4);
    await expect(model.findByIdAndUserId(2, 1)).resolves.toEqual({ id: 2 });
  });

  it('creates a primary contact and resets older primaries', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 5 }])
      .mockResolvedValueOnce([[{ id: 5, is_primary: 1 }]]);

    await expect(
      model.create(1, {
        name: 'Mom',
        phone: '13800000000',
        relationship: 'mother',
        isPrimary: true,
      })
    ).resolves.toEqual({ id: 5, is_primary: 1 });

    expect(query).toHaveBeenNthCalledWith(
      1,
      'UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?',
      [1]
    );
  });

  it('updates contacts and returns null when no row changes', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 7 }]]);
    await expect(model.updateByIdAndUserId(7, 1, {})).resolves.toEqual({ id: 7 });

    query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(model.updateByIdAndUserId(7, 1, { name: 'New' })).resolves.toBeNull();

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 7, name: 'New' }]]);
    await expect(
      model.updateByIdAndUserId(7, 1, { name: 'New', phone: '138', relationship: 'friend' })
    ).resolves.toEqual({ id: 7, name: 'New' });
  });

  it('sets primary contact and deletes contacts', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ id: 8 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 8, is_primary: 1 }]]);

    await expect(model.setPrimaryByIdAndUserId(8, 1)).resolves.toEqual({ id: 8, is_primary: 1 });

    query.mockResolvedValueOnce([[]]);
    await expect(model.setPrimaryByIdAndUserId(9, 1)).resolves.toBeNull();

    query.mockResolvedValueOnce([{ affectedRows: 2 }]);
    await expect(model.deleteByIdAndUserId(8, 1)).resolves.toBe(2);
  });
});
