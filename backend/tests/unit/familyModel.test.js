'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/family');
  return { model, query: db.query };
};

describe('familyModel', () => {
  it('lists bindings using discovered family binding columns', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ Field: 'elder_id' }, { Field: 'family_id' }, { Field: 'status' }]])
      .mockResolvedValueOnce([
        [
          {
            id: 3,
            elder_id: 7,
            family_id: 8,
            status: 'active',
            binding_created_at: '2026-03-11 10:00:00',
            elder_nickname: 'Elder',
            elder_name: 'Alice',
            elder_avatar: 'avatar',
            elder_gender: 'female',
            elder_age: 75,
            health_archive_id: 11,
            health_updated_at: '2026-03-11 09:00:00',
          },
        ],
      ]);

    await expect(model.listBindingsByFamilyId(8)).resolves.toEqual([
      {
        bindingId: 3,
        elderId: 7,
        familyId: 8,
        status: 'active',
        boundAt: '2026-03-11 10:00:00',
        elderProfile: {
          nickname: 'Elder',
          realName: 'Alice',
          avatarUrl: 'avatar',
          gender: 'female',
          age: 75,
        },
        healthArchive: {
          id: 11,
          updatedAt: '2026-03-11 09:00:00',
        },
      },
    ]);
  });

  it('checks family binding with cached schema metadata', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([[{ Field: 'elder_user_id' }, { Field: 'family_user_id' }, { Field: 'binding_status' }]])
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[]]);

    await expect(model.checkFamilyBinding(8, 7)).resolves.toBe(true);
    await expect(model.checkFamilyBinding(8, 9)).resolves.toBe(false);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('returns latest health snapshot or null when archive is missing', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[]]);
    await expect(model.getLatestHealthSnapshot(7)).resolves.toBeNull();

    query
      .mockResolvedValueOnce([[{ id: 5, user_id: 7, created_at: 'c', updated_at: 'u' }]])
      .mockResolvedValueOnce([[{ id: 1, metric_type: 'heart_rate', value: '70', created_at: 'x' }]]);

    await expect(model.getLatestHealthSnapshot(7)).resolves.toEqual({
      archive: {
        id: 5,
        userId: 7,
        createdAt: 'c',
        updatedAt: 'u',
      },
      latestRecords: [
        {
          id: 1,
          metricType: 'heart_rate',
          value: '70',
          valueHigh: undefined,
          valueLow: undefined,
          source: undefined,
          measuredAt: undefined,
          syncedAt: undefined,
          createdAt: 'x',
        },
      ],
    });
  });

  it('reads and upserts notification settings', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[]]);
    await expect(model.findNotificationSettingsByUserId(7)).resolves.toBeNull();

    query
      .mockResolvedValueOnce([[{ user_id: 7, health_alert_enabled: 1, medication_reminder_enabled: 0, sos_alert_enabled: 1, created_at: 'c', updated_at: 'u' }]]);
    await expect(model.findNotificationSettingsByUserId(7)).resolves.toEqual({
      userId: 7,
      healthAlertEnabled: true,
      medicationReminderEnabled: false,
      sosAlertEnabled: true,
      createdAt: 'c',
      updatedAt: 'u',
    });

    query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ user_id: 7, health_alert_enabled: 0, medication_reminder_enabled: 1, sos_alert_enabled: 0, created_at: 'c2', updated_at: 'u2' }]]);
    await expect(
      model.upsertNotificationSettings(7, {
        healthAlertEnabled: false,
        medicationReminderEnabled: true,
        sosAlertEnabled: false,
      })
    ).resolves.toEqual({
      userId: 7,
      healthAlertEnabled: false,
      medicationReminderEnabled: true,
      sosAlertEnabled: false,
      createdAt: 'c2',
      updatedAt: 'u2',
    });
  });

  it('returns latest location and swallows location lookup failures', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ latitude: 30.1, longitude: 120.1, address: null, updated_at: 't' }]]);
    await expect(model.getLatestLocation(7)).resolves.toEqual({
      latitude: 30.1,
      longitude: 120.1,
      address: '',
      updatedAt: 't',
    });

    query.mockRejectedValueOnce(new Error('missing table'));
    await expect(model.getLatestLocation(7)).resolves.toBeNull();
  });
});
