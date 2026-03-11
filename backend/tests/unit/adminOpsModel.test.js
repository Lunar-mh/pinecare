'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/adminOpsModel');
  return { model, query: db.query };
};

describe('adminOpsModel', () => {
  it('lists overview, medication, gps, and family binding data', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[{ id: 3 }]])
      .mockResolvedValueOnce([[{ total: 4 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 8 }]])
      .mockResolvedValueOnce([[{ id: 5 }]])
      .mockResolvedValueOnce([[{ total: 6 }]])
      .mockResolvedValueOnce([[{ id: 7 }]])
      .mockResolvedValueOnce([[{ Field: 'elder_id' }, { Field: 'family_id' }, { Field: 'status' }]])
      .mockResolvedValueOnce([[{ id: 9 }]])
      .mockResolvedValueOnce([[{ total: 10 }]]);

    await expect(model.listHealthOverview({ search: 'alice', communityId: 9 }, { pageSize: 5, offset: 5 })).resolves.toEqual([{ id: 1 }]);
    await expect(model.countHealthOverview({ search: 'alice', communityId: 9 })).resolves.toBe(2);
    await expect(
      model.listMedicationLogs(
        { search: 'drug', status: 'pending', startDate: '2026-03-01', endDate: '2026-03-31', communityId: 9 },
        { pageSize: 5, offset: 0 }
      )
    ).resolves.toEqual([{ id: 3 }]);
    await expect(
      model.countMedicationLogs({ search: 'drug', status: 'pending', startDate: '2026-03-01', endDate: '2026-03-31', communityId: 9 })
    ).resolves.toBe(4);
    await expect(model.updateMedicationLogStatus(8, 'taken')).resolves.toBe(1);
    await expect(model.getMedicationLogById(8, 9)).resolves.toEqual({ id: 8 });
    await expect(model.listGpsCurrent({ search: 'bob', communityId: 9 }, { pageSize: 5, offset: 0 })).resolves.toEqual([{ id: 5 }]);
    await expect(model.countGpsCurrent({ search: 'bob', communityId: 9 })).resolves.toBe(6);
    await expect(
      model.listGpsTrail(7, { startDate: '2026-03-01', endDate: '2026-03-02', limit: 50, communityId: 9 })
    ).resolves.toEqual([{ id: 7 }]);
    await expect(model.listFamilyBindings({ search: 'elder', status: 'active', communityId: 9 }, { pageSize: 5, offset: 0 })).resolves.toEqual([{ id: 9 }]);
    await expect(model.countFamilyBindings({ search: 'elder', status: 'active', communityId: 9 })).resolves.toBe(10);
  });

  it('lists medical, sos, fall, and drug interaction records', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[{ id: 3 }]])
      .mockResolvedValueOnce([[{ total: 4 }]])
      .mockResolvedValueOnce([[{ id: 5 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ sos_event_id: 3 }]])
      .mockResolvedValueOnce([[{ id: 6 }]])
      .mockResolvedValueOnce([[{ total: 7 }]])
      .mockResolvedValueOnce([[{ id: 8 }]])
      .mockResolvedValueOnce([{ affectedRows: 2 }])
      .mockResolvedValueOnce([[{ id: 9 }]]);

    await expect(
      model.listMedicalReports({ search: 'report', reportType: 'exam', startDate: '2026-03-01', endDate: '2026-03-31', communityId: 9 }, { pageSize: 5, offset: 0 })
    ).resolves.toEqual([{ id: 1 }]);
    await expect(
      model.countMedicalReports({ search: 'report', reportType: 'exam', startDate: '2026-03-01', endDate: '2026-03-31', communityId: 9 })
    ).resolves.toBe(2);
    await expect(model.listSosEvents({ search: 'addr', status: 'triggered', communityId: 9 }, { pageSize: 5, offset: 0 })).resolves.toEqual([{ id: 3 }]);
    await expect(model.countSosEvents({ search: 'addr', status: 'triggered', communityId: 9 })).resolves.toBe(4);
    await expect(model.getSosEventById(5, 9)).resolves.toEqual({ id: 5 });
    await expect(model.updateSosEventStatus(5, 'triggered', 'confirmed')).resolves.toBe(1);
    await expect(model.summarizeSosNotifications([3, 4])).resolves.toEqual([{ sos_event_id: 3 }]);
    await expect(model.listFallEvents({ search: 'alice', status: 'confirmed', communityId: 9 }, { pageSize: 5, offset: 0 })).resolves.toEqual([{ id: 6 }]);
    await expect(model.countFallEvents({ search: 'alice', status: 'confirmed', communityId: 9 })).resolves.toBe(7);
    await expect(model.listDrugInteractions({ search: 'med', status: 'pending', communityId: 9 }, { pageSize: 50, offset: 0 })).resolves.toEqual([{ id: 8 }]);
    await expect(model.updateDrugInteractionStatus(8, 'acknowledged')).resolves.toBe(2);
    await expect(model.getDrugInteractionById(9, 9)).resolves.toEqual({ id: 9 });
    await expect(model.summarizeSosNotifications([])).resolves.toEqual([]);
  });

  it('lists time bank history, exchanges, and leaderboard variants', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[{ id: 3 }]])
      .mockResolvedValueOnce([[{ id: 4 }]])
      .mockResolvedValueOnce([[{ id: 5 }]])
      .mockResolvedValueOnce([[{ user_id: 6 }]])
      .mockResolvedValueOnce([[{ user_id: 7 }]]);

    await expect(
      model.listTimeBankServiceHistory({ search: 'escort', status: 'pending', communityId: 9 }, { pageSize: 10, offset: 10 })
    ).resolves.toEqual([{ id: 1 }]);
    await expect(model.countTimeBankServiceHistory({ search: 'escort', status: 'pending', communityId: 9 })).resolves.toBe(2);
    await expect(model.getTimeBankServiceRecordById(3, 9)).resolves.toEqual({ id: 3 });
    await expect(model.listTimeBankExchangeHistory({ limit: 50, communityId: 9 })).resolves.toEqual([{ id: 4 }]);
    await expect(model.listTimeBankExchangeHistory({ limit: 20 })).resolves.toEqual([{ id: 5 }]);
    await expect(model.listTimeBankLeaderboard({ communityId: 9, limit: 10 })).resolves.toEqual([{ user_id: 6 }]);
    await expect(model.listTimeBankLeaderboard({ limit: 10 })).resolves.toEqual([{ user_id: 7 }]);
  });
});
