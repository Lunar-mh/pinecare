'use strict';

jest.mock('../../src/models/deviceBindingModel', () => ({
  bindDevice: jest.fn(),
  unbindDevice: jest.fn(),
  listDevices: jest.fn(),
  setPrimary: jest.fn(),
}));

const deviceBindingModel = require('../../src/models/deviceBindingModel');
const deviceService = require('../../src/services/deviceService');

describe('deviceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bind validates required fields', async () => {
    await expect(deviceService.bind(1001, {})).rejects.toMatchObject({
      code: 400,
      statusCode: 400,
    });
  });

  it('bind validates battery range', async () => {
    await expect(
      deviceService.bind(1001, {
        device_name: 'Watch',
        device_mac: 'AA:BB',
        device_type: 'watch',
        battery_level: 101,
      })
    ).rejects.toMatchObject({
      code: 400,
      statusCode: 400,
    });
  });

  it('bind maps payload fields and returns device wrapper', async () => {
    deviceBindingModel.bindDevice.mockResolvedValue({
      id: 1,
      userId: 1001,
      deviceName: 'Watch',
      deviceMac: 'AA:BB',
      deviceType: 'watch',
      isPrimary: true,
      batteryLevel: 88,
    });

    const result = await deviceService.bind(1001, {
      deviceName: 'Watch',
      deviceMac: 'AA:BB',
      deviceType: 'watch',
      isPrimary: true,
      batteryLevel: 88,
      lastSyncAt: '2026-03-11 11:00:00',
    });

    expect(deviceBindingModel.bindDevice).toHaveBeenCalledWith({
      userId: 1001,
      deviceName: 'Watch',
      deviceMac: 'AA:BB',
      deviceType: 'watch',
      isPrimary: true,
      batteryLevel: 88,
      lastSyncAt: '2026-03-11 11:00:00',
    });
    expect(result.device.id).toBe(1);
  });

  it('unbind validates device id', async () => {
    await expect(deviceService.unbind(1001, { deviceId: 'bad' })).rejects.toMatchObject({
      code: 400,
      statusCode: 400,
    });
  });

  it('unbind returns success payload when device exists', async () => {
    deviceBindingModel.unbindDevice.mockResolvedValue(true);

    await expect(deviceService.unbind(1001, { deviceId: 9 })).resolves.toEqual({
      deviceId: 9,
      unbound: true,
    });
    expect(deviceBindingModel.unbindDevice).toHaveBeenCalledWith(1001, 9);
  });

  it('unbind throws 404 when target device is missing', async () => {
    deviceBindingModel.unbindDevice.mockResolvedValue(false);

    await expect(deviceService.unbind(1001, { deviceId: 9 })).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
    });
  });

  it('list returns wrapped device list', async () => {
    deviceBindingModel.listDevices.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await deviceService.list(1001);

    expect(result).toEqual({ list: [{ id: 1 }, { id: 2 }] });
  });

  it('setPrimary returns updated list', async () => {
    deviceBindingModel.setPrimary.mockResolvedValue(true);
    deviceBindingModel.listDevices.mockResolvedValue([{ id: 3, isPrimary: true }]);

    const result = await deviceService.setPrimary(1001, { deviceId: 3 });

    expect(deviceBindingModel.setPrimary).toHaveBeenCalledWith(1001, 3);
    expect(result).toEqual({
      deviceId: 3,
      list: [{ id: 3, isPrimary: true }],
    });
  });

  it('setPrimary throws 404 when target device is missing', async () => {
    deviceBindingModel.setPrimary.mockResolvedValue(false);

    await expect(deviceService.setPrimary(1001, { deviceId: 3 })).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
    });
  });
});
