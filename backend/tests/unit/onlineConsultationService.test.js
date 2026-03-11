'use strict';

jest.mock('../../src/models/onlineConsultationModel', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  listByUserId: jest.fn(),
}));

jest.mock('../../src/services/medicalApiService', () => ({
  createConsultSession: jest.fn(),
  getSourceTag: jest.fn(() => 'third_party_live'),
  getCapabilityReport: jest.fn(() => ({
    mode: 'auto',
    effectiveMode: 'live',
    liveConfigured: true,
    fallbackAllowed: true,
    circuitOpen: false,
    missingConfig: [],
  })),
}));

const onlineConsultationModel = require('../../src/models/onlineConsultationModel');
const medicalApiService = require('../../src/services/medicalApiService');
const onlineConsultationService = require('../../src/services/onlineConsultationService');

describe('onlineConsultationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts a consultation and returns source tag', async () => {
    medicalApiService.createConsultSession.mockResolvedValue({
      consultStatus: 'active',
      sessionUrl: 'https://consult.example.com/1',
      thirdPartySessionId: 'tp-consult-1',
      startedAt: '2026-03-11T09:00:00.000Z',
    });
    onlineConsultationModel.create.mockResolvedValue({
      id: 1,
      userId: 9,
      doctorId: 3,
      department: 'Cardiology',
      consultStatus: 'active',
    });

    const result = await onlineConsultationService.start(9, {
      doctorId: 3,
      department: 'Cardiology',
    });

    expect(medicalApiService.createConsultSession).toHaveBeenCalledWith({
      userId: 9,
      doctorId: 3,
      department: 'Cardiology',
    });
    expect(result).toMatchObject({
      source: 'third_party_live',
      fallbackUsed: false,
      consultation: {
        id: 1,
        userId: 9,
        doctorId: 3,
        department: 'Cardiology',
        consultStatus: 'active',
      },
      diagnostics: {
        requestedMode: 'auto',
        effectiveMode: 'live',
        reason: 'consult_session_started',
      },
    });
  });

  it('marks diagnostics as stub when upstream already fell back', async () => {
    medicalApiService.getSourceTag.mockReturnValueOnce('third_party_stub');
    medicalApiService.getCapabilityReport.mockReturnValueOnce({
      mode: 'live',
      effectiveMode: 'stub',
      liveConfigured: true,
      fallbackAllowed: true,
      circuitOpen: false,
      missingConfig: [],
    });
    medicalApiService.createConsultSession.mockResolvedValue({
      consultStatus: 'active',
      sessionUrl: 'https://consult.example.com/2',
      thirdPartySessionId: 'tp-consult-2',
      startedAt: '2026-03-11T09:00:00.000Z',
    });
    onlineConsultationModel.create.mockResolvedValue({
      id: 2,
      userId: 9,
      doctorId: 5,
      department: 'Neurology',
      consultStatus: 'active',
    });

    const result = await onlineConsultationService.start(9, {
      doctorId: 5,
      department: 'Neurology',
    });

    expect(result).toMatchObject({
      source: 'third_party_stub',
      mode: 'stub',
      diagnostics: {
        requestedMode: 'live',
        effectiveMode: 'stub',
      },
    });
  });

  it('validates doctorId and department on start', async () => {
    await expect(
      onlineConsultationService.start(9, { doctorId: 'bad', department: '' })
    ).rejects.toMatchObject({
      code: 422,
      statusCode: 422,
    });
  });

  it('rejects status update when record does not belong to user', async () => {
    onlineConsultationModel.findById.mockResolvedValue({
      id: 1,
      userId: 99,
      consultStatus: 'active',
    });

    await expect(onlineConsultationService.updateStatus(9, 1, 'completed')).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
    });
  });

  it('rejects invalid consultation status transition', async () => {
    onlineConsultationModel.findById.mockResolvedValue({
      id: 1,
      userId: 9,
      consultStatus: 'completed',
    });

    await expect(onlineConsultationService.updateStatus(9, 1, 'active')).rejects.toMatchObject({
      code: 409,
      statusCode: 409,
    });
  });

  it('updates status and reloads consultation record', async () => {
    onlineConsultationModel.findById
      .mockResolvedValueOnce({
        id: 1,
        userId: 9,
        consultStatus: 'active',
      })
      .mockResolvedValueOnce({
        id: 1,
        userId: 9,
        consultStatus: 'completed',
      });
    onlineConsultationModel.updateStatus.mockResolvedValue(true);

    const result = await onlineConsultationService.updateStatus(9, 1, 'completed');

    expect(onlineConsultationModel.updateStatus).toHaveBeenCalledWith(
      1,
      'completed',
      expect.objectContaining({
        endedAt: expect.any(Date),
      })
    );
    expect(result).toMatchObject({
      source: 'local',
      consultation: { consultStatus: 'completed' },
      diagnostics: { reason: 'consultation_status_updated' },
    });
  });

  it('throws 500 when status update write fails', async () => {
    onlineConsultationModel.findById.mockResolvedValue({
      id: 1,
      userId: 9,
      consultStatus: 'active',
    });
    onlineConsultationModel.updateStatus.mockResolvedValue(false);

    await expect(onlineConsultationService.updateStatus(9, 1, 'completed')).rejects.toMatchObject({
      code: 500,
      statusCode: 500,
    });
  });

  it('lists consultation records for a user with local diagnostics envelope', async () => {
    onlineConsultationModel.listByUserId.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await onlineConsultationService.listByUser(9, 'not-a-number');

    expect(onlineConsultationModel.listByUserId).toHaveBeenCalledWith(9, 20);
    expect(result).toMatchObject({
      source: 'local',
      fallbackUsed: false,
      list: [{ id: 1 }, { id: 2 }],
      diagnostics: { reason: 'consultation_local_list' },
    });
  });
});
