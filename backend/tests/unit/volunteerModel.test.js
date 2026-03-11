'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/volunteerModel');
  return { model, query: db.query };
};

describe('volunteerModel', () => {
  const scope = { userId: 88, communityId: 9 };

  it('finds volunteer scope and task detail', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ user_id: 88 }]]);
    query.mockResolvedValueOnce([[{ id: 15, status: 'pending' }]]);

    await expect(model.findVolunteerScopeByUserId(88)).resolves.toEqual({ user_id: 88 });
    await expect(model.findTaskByIdForVolunteer(scope, 15)).resolves.toEqual({
      id: 15,
      status: 'pending',
    });
  });

  it('lists tasks and counts totals with status and keyword filters', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 1 }]]);
    query.mockResolvedValueOnce([[{ total: 6 }]]);

    const filters = { status: 'assigned', keyword: 'escort' };
    const list = await model.listTasksByVolunteer(scope, filters, { page: 2, pageSize: 5 });
    const total = await model.countTasksByVolunteer(scope, filters);

    expect(list).toEqual([{ id: 1 }]);
    expect(total).toBe(6);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ORDER BY'),
      [9, 88, 'pending', 'assigned', '%escort%', '%escort%', '%escort%', 5, 5]
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('COUNT(1) AS total'),
      [9, 88, 'pending', 'assigned', '%escort%', '%escort%', '%escort%']
    );
  });

  it('normalizes task summary counts', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([
      [
        {
          available_count: '2',
          assigned_count: '1',
          processing_count: '0',
          completed_count: null,
        },
      ],
    ]);

    await expect(model.countTaskSummary(scope)).resolves.toEqual({
      available_count: 2,
      assigned_count: 1,
      processing_count: 0,
      completed_count: 0,
    });
  });

  it('accepts tasks and updates owned status with optional completion', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await expect(model.acceptTask(5, scope)).resolves.toEqual({ affectedRows: 1 });
    await expect(
      model.updateOwnedTaskStatus(5, 88, 'completed', { completedAt: '2026-03-11 10:00:00' })
    ).resolves.toEqual({ affectedRows: 1 });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET status = ?, completed_at = ?'),
      ['completed', '2026-03-11 10:00:00', 5, 88]
    );
  });

  it('upserts attendance and reads it back', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    query.mockResolvedValueOnce([[{ order_id: 5, volunteer_user_id: 88 }]]);

    await expect(
      model.upsertAttendance({
        orderId: 5,
        communityId: 9,
        volunteerUserId: 88,
        checkInAt: '2026-03-11 09:00:00',
        checkOutAt: null,
      })
    ).resolves.toEqual({ affectedRows: 1 });
    await expect(model.getAttendanceByOrderId(scope, 5)).resolves.toEqual({
      order_id: 5,
      volunteer_user_id: 88,
    });
  });

  it('finds volunteer profile and training rows', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 88, community_id: 9 }]]);
    query.mockResolvedValueOnce([[{ id: 3 }]]);
    query.mockResolvedValueOnce([[{ total: 2 }]]);

    await expect(model.findProfileByUserId(88, 9)).resolves.toEqual({ id: 88, community_id: 9 });
    await expect(
      model.listTrainingByVolunteerId(scope, { status: 'completed' }, { page: 2, pageSize: 3 })
    ).resolves.toEqual([{ id: 3 }]);
    await expect(model.countTrainingByVolunteerId(scope, { status: 'completed' })).resolves.toBe(2);
  });
});
