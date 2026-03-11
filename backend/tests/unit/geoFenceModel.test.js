'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/geoFenceModel');
  return { model, query: db.query };
};

describe('geoFenceModel', () => {
  it('create inserts a fence and loads the saved record', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ insertId: 7 }]);
    query.mockResolvedValueOnce([
      [
        {
          id: 7,
          user_id: 101,
          name: '活动区',
          fence_type: 'circle',
          center_lat: '31.2',
          center_lng: '121.5',
          radius: '100',
          points: null,
          alert_type: 'both',
          is_active: 1,
          created_at: '2026-03-11 12:00:00',
        },
      ],
    ]);

    const result = await model.create({
      userId: 101,
      name: '活动区',
      fenceType: 'circle',
      centerLat: 31.2,
      centerLng: 121.5,
      radius: 100,
      alertType: 'both',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO geo_fences'),
      [101, '活动区', 'circle', 31.2, 121.5, 100, null, 'both', 1]
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 7,
        centerLat: 31.2,
        radius: 100,
        points: [],
        isActive: true,
      })
    );
  });

  it('findByIdAndUserId returns null when no record exists', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([[]]);

    await expect(model.findByIdAndUserId(1, 2)).resolves.toBeNull();
  });

  it('updateByIdAndUserId returns current record when patch is empty', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([
      [
        {
          id: 2,
          user_id: 8,
          name: '保留区',
          fence_type: 'polygon',
          center_lat: null,
          center_lng: null,
          radius: null,
          points: JSON.stringify([{ lat: 1, lng: 2 }]),
          alert_type: 'exit',
          is_active: 0,
          created_at: '2026-03-11 09:00:00',
        },
      ],
    ]);

    const result = await model.updateByIdAndUserId(2, 8, {});

    expect(query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: 2,
        fenceType: 'polygon',
        points: [{ lat: 1, lng: 2 }],
        isActive: false,
      })
    );
  });

  it('updateByIdAndUserId serializes points and returns null when nothing changed', async () => {
    let loaded = loadModel();
    loaded.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(
      loaded.model.updateByIdAndUserId(2, 8, { points: [{ lat: 1, lng: 2 }], isActive: true })
    ).resolves.toBeNull();

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    loaded.query.mockResolvedValueOnce([
      [
        {
          id: 2,
          user_id: 8,
          name: '更新区',
          fence_type: 'polygon',
          center_lat: null,
          center_lng: null,
          radius: null,
          points: 'bad-json',
          alert_type: 'enter',
          is_active: 1,
          created_at: '2026-03-11 10:00:00',
        },
      ],
    ]);

    const result = await loaded.model.updateByIdAndUserId(2, 8, {
      name: '更新区',
      points: [{ lat: 3, lng: 4 }],
      isActive: true,
    });

    expect(loaded.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE geo_fences'),
      ['更新区', JSON.stringify([{ lat: 3, lng: 4 }]), 1, 2, 8]
    );
    expect(result.points).toEqual([]);
  });

  it('deleteByIdAndUserId and toggleByIdAndUserId return affected results', async () => {
    let loaded = loadModel();
    loaded.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(loaded.model.deleteByIdAndUserId(3, 4)).resolves.toBe(1);

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(loaded.model.toggleByIdAndUserId(3, 4, false)).resolves.toBeNull();
  });

  it('listByUserId and getActiveByUserId map rows into API shape', async () => {
    let loaded = loadModel();
    loaded.query.mockResolvedValueOnce([
      [
        {
          id: 5,
          user_id: 4,
          name: '全部围栏',
          fence_type: 'circle',
          center_lat: '30.1',
          center_lng: '120.1',
          radius: '50',
          points: null,
          alert_type: 'both',
          is_active: 1,
          created_at: '2026-03-11 11:00:00',
        },
      ],
    ]);
    await expect(loaded.model.listByUserId(4)).resolves.toEqual([
      expect.objectContaining({ id: 5, isActive: true }),
    ]);

    loaded = loadModel();
    loaded.query.mockResolvedValueOnce([[{ id: 6, user_id: 4, name: '激活围栏', fence_type: 'circle', center_lat: '30', center_lng: '120', radius: '60', points: null, alert_type: 'both', is_active: 1, created_at: '2026-03-11 11:30:00' }]]);
    await expect(loaded.model.getActiveByUserId(4)).resolves.toEqual([
      expect.objectContaining({ id: 6, radius: 60 }),
    ]);
  });
});
