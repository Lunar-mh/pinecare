'use strict';

jest.mock('../../src/models/fenceAlertModel', () => ({
  listByUserId: jest.fn(),
}));

const fenceAlertModel = require('../../src/models/fenceAlertModel');
const alertService = require('../../src/services/alertService');

describe('alertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes null handled filter when query flag is absent', async () => {
    fenceAlertModel.listByUserId.mockResolvedValue([{ id: 1 }]);

    const result = await alertService.listAlerts(1001, {});

    expect(fenceAlertModel.listByUserId).toHaveBeenCalledWith(1001, null);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('normalizes true-like handled values', async () => {
    fenceAlertModel.listByUserId.mockResolvedValue([]);

    await alertService.listAlerts(1001, { isHandled: 'true' });
    expect(fenceAlertModel.listByUserId).toHaveBeenCalledWith(1001, true);

    await alertService.listAlerts(1001, { isHandled: 1 });
    expect(fenceAlertModel.listByUserId).toHaveBeenCalledWith(1001, true);
  });

  it('normalizes false-like handled values', async () => {
    fenceAlertModel.listByUserId.mockResolvedValue([]);

    await alertService.listAlerts(1001, { isHandled: 'false' });
    expect(fenceAlertModel.listByUserId).toHaveBeenCalledWith(1001, false);

    await alertService.listAlerts(1001, { isHandled: 0 });
    expect(fenceAlertModel.listByUserId).toHaveBeenCalledWith(1001, false);
  });

  it('falls back to null for unsupported handled values', async () => {
    fenceAlertModel.listByUserId.mockResolvedValue([]);

    await alertService.listAlerts(1001, { isHandled: 'maybe' });

    expect(fenceAlertModel.listByUserId).toHaveBeenCalledWith(1001, null);
  });
});
