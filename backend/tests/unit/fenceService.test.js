'use strict';

jest.mock('../../src/models/geoFenceModel', () => ({
  listByUserId: jest.fn(),
  create: jest.fn(),
  findByIdAndUserId: jest.fn(),
  updateByIdAndUserId: jest.fn(),
  deleteByIdAndUserId: jest.fn(),
  toggleByIdAndUserId: jest.fn(),
}));

const geoFenceModel = require('../../src/models/geoFenceModel');
const fenceService = require('../../src/services/fenceService');

describe('fenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists fences by user id', async () => {
    geoFenceModel.listByUserId.mockResolvedValue([{ id: 1 }]);

    await expect(fenceService.list(1001)).resolves.toEqual([{ id: 1 }]);
    expect(geoFenceModel.listByUserId).toHaveBeenCalledWith(1001);
  });

  it('creates a circle fence with normalized numeric fields', async () => {
    geoFenceModel.create.mockResolvedValue({ id: 2, fenceType: 'circle' });

    const result = await fenceService.create(99, {
      name: ' 家附近 ',
      fenceType: 'circle',
      centerLat: '31.2',
      centerLng: '121.5',
      radius: '88.9',
      alertType: 'enter',
      isActive: true,
    });

    expect(geoFenceModel.create).toHaveBeenCalledWith({
      userId: 99,
      name: '家附近',
      fenceType: 'circle',
      centerLat: 31.2,
      centerLng: 121.5,
      radius: 88,
      alertType: 'enter',
      isActive: true,
    });
    expect(result).toEqual({ id: 2, fenceType: 'circle' });
  });

  it('creates a polygon fence and defaults alert type to both', async () => {
    geoFenceModel.create.mockResolvedValue({ id: 3, fenceType: 'polygon' });

    await fenceService.create(88, {
      name: '活动区',
      fenceType: 'polygon',
      points: [
        { lat: '31.1', lng: '121.1' },
        { lat: '31.2', lng: '121.2' },
        { lat: '31.3', lng: '121.1' },
      ],
      isActive: false,
    });

    expect(geoFenceModel.create).toHaveBeenCalledWith({
      userId: 88,
      name: '活动区',
      fenceType: 'polygon',
      points: [
        { lat: 31.1, lng: 121.1 },
        { lat: 31.2, lng: 121.2 },
        { lat: 31.3, lng: 121.1 },
      ],
      alertType: 'both',
      isActive: false,
    });
  });

  it('rejects invalid fence payloads', async () => {
    await expect(
      fenceService.create(1, { fenceType: 'circle', centerLat: 91, centerLng: 120, radius: 100 })
    ).rejects.toMatchObject({ code: 400, statusCode: 400 });

    await expect(
      fenceService.create(1, {
        name: 'bad polygon',
        fenceType: 'polygon',
        points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }],
      })
    ).rejects.toMatchObject({ code: 400, statusCode: 400 });
  });

  it('updates existing fence and returns updated record', async () => {
    geoFenceModel.findByIdAndUserId.mockResolvedValue({ id: 4, fenceType: 'circle' });
    geoFenceModel.updateByIdAndUserId.mockResolvedValue({ id: 4, name: '更新后' });

    const result = await fenceService.update(10, 4, {
      name: ' 更新后 ',
      radius: '150',
      centerLat: '31.22',
      centerLng: '121.48',
      isActive: false,
    });

    expect(geoFenceModel.updateByIdAndUserId).toHaveBeenCalledWith(4, 10, {
      name: '更新后',
      fenceType: undefined,
      centerLat: 31.22,
      centerLng: 121.48,
      radius: 150,
      points: undefined,
      alertType: undefined,
      isActive: false,
    });
    expect(result).toEqual({ id: 4, name: '更新后' });
  });

  it('throws 404 when updating a missing fence', async () => {
    geoFenceModel.findByIdAndUserId.mockResolvedValue(null);

    await expect(fenceService.update(10, 4, { name: 'x' })).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
    });
  });

  it('throws 500 when update write fails unexpectedly', async () => {
    geoFenceModel.findByIdAndUserId.mockResolvedValue({ id: 4, fenceType: 'circle' });
    geoFenceModel.updateByIdAndUserId.mockResolvedValue(null);

    await expect(fenceService.update(10, 4, { name: 'x' })).rejects.toMatchObject({
      code: 500,
      statusCode: 500,
    });
  });

  it('remove and toggle surface not found as 404', async () => {
    geoFenceModel.deleteByIdAndUserId.mockResolvedValue(0);
    await expect(fenceService.remove(1, 5)).rejects.toMatchObject({ code: 404, statusCode: 404 });

    geoFenceModel.toggleByIdAndUserId.mockResolvedValue(null);
    await expect(fenceService.toggle(1, 5, true)).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
    });
  });

  it('toggle coerces active flag to boolean and returns updated fence', async () => {
    geoFenceModel.toggleByIdAndUserId.mockResolvedValue({ id: 9, isActive: false });

    await expect(fenceService.toggle(1, 9, 0)).resolves.toEqual({ id: 9, isActive: false });
    expect(geoFenceModel.toggleByIdAndUserId).toHaveBeenCalledWith(9, 1, false);
  });
});
