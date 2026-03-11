'use strict';

jest.mock('../../src/models/appointmentModel', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUserId: jest.fn(),
  findByIdempotencyKey: jest.fn(),
  updateStatus: jest.fn(),
  listByUserId: jest.fn(),
}));

jest.mock('../../src/services/medicalApiService', () => ({
  createAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
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

const appointmentModel = require('../../src/models/appointmentModel');
const medicalApiService = require('../../src/services/medicalApiService');
const appointmentService = require('../../src/services/appointmentService');

describe('appointmentService', () => {
  const validPayload = {
    hospitalId: 10,
    department: 'Cardiology',
    doctorId: 88,
    appointmentDate: '2026-03-10',
    timeSlot: '09:00-09:30',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses provided idempotencyKey when creating appointment', async () => {
    appointmentModel.findByIdempotencyKey.mockResolvedValue(null);
    medicalApiService.createAppointment.mockResolvedValue({
      thirdPartyAppointId: 'tp-1',
      appointStatus: 'confirmed',
    });
    appointmentModel.create.mockResolvedValue({ id: 1, appointStatus: 'confirmed' });

    const result = await appointmentService.create(1, {
      ...validPayload,
      idempotencyKey: 'req-001',
    });

    expect(appointmentModel.findByIdempotencyKey).toHaveBeenCalledWith('req-001');
    expect(medicalApiService.createAppointment).toHaveBeenCalledWith({
      userId: 1,
      hospitalId: 10,
      doctorId: 88,
      department: 'Cardiology',
      appointmentDate: '2026-03-10',
      timeSlot: '09:00-09:30',
      requestId: 'req-001',
    });
    expect(result).toMatchObject({
      duplicate: false,
      idempotencyKey: 'req-001',
      source: 'third_party_live',
      fallbackUsed: false,
      diagnostics: {
        requestedMode: 'auto',
        effectiveMode: 'live',
        reason: 'appointment_created',
        configState: 'ready',
      },
    });
  });

  it('falls back to hashed idempotencyKey when no request key provided', async () => {
    appointmentModel.findByIdempotencyKey.mockResolvedValue(null);
    medicalApiService.createAppointment.mockResolvedValue({
      thirdPartyAppointId: 'tp-2',
      appointStatus: 'confirmed',
    });
    appointmentModel.create.mockResolvedValue({ id: 2, appointStatus: 'confirmed' });

    const result = await appointmentService.create(2, validPayload);

    expect(result.idempotencyKey).toHaveLength(64);
    expect(appointmentModel.findByIdempotencyKey).toHaveBeenCalledWith(result.idempotencyKey);
  });

  it('throws 422 when idempotencyKey has invalid chars', async () => {
    await expect(
      appointmentService.create(1, {
        ...validPayload,
        idempotencyKey: 'bad key with spaces',
      })
    ).rejects.toMatchObject({ code: 422, statusCode: 422 });
  });

  it('returns existing appointment on duplicate idempotency key', async () => {
    appointmentModel.findByIdempotencyKey.mockResolvedValue({ id: 9, appointStatus: 'confirmed' });

    const result = await appointmentService.create(1, {
      ...validPayload,
      idempotencyKey: 'req-dup',
    });

    expect(result).toMatchObject({
      duplicate: true,
      idempotencyKey: 'req-dup',
      source: 'local',
      appointment: { id: 9, appointStatus: 'confirmed' },
      diagnostics: {
        reason: 'idempotent_replay',
      },
    });
    expect(medicalApiService.createAppointment).not.toHaveBeenCalled();
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
    appointmentModel.findByIdempotencyKey.mockResolvedValue(null);
    medicalApiService.createAppointment.mockResolvedValue({
      thirdPartyAppointId: 'tp-stub',
      appointStatus: 'confirmed',
    });
    appointmentModel.create.mockResolvedValue({ id: 3, appointStatus: 'confirmed' });

    const result = await appointmentService.create(3, validPayload);

    expect(result).toMatchObject({
      source: 'third_party_stub',
      mode: 'stub',
      diagnostics: {
        requestedMode: 'live',
        effectiveMode: 'stub',
        reason: 'appointment_created',
      },
    });
  });

  it('lists appointments with local diagnostics envelope', async () => {
    appointmentModel.listByUserId.mockResolvedValue({
      list: [{ id: 12, appointStatus: 'confirmed' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const result = await appointmentService.listByUser(1, {
      status: 'confirmed',
      page: 1,
      pageSize: 10,
    });

    expect(result).toMatchObject({
      source: 'local',
      fallbackUsed: false,
      list: [{ id: 12, appointStatus: 'confirmed' }],
      total: 1,
      diagnostics: {
        reason: 'appointment_local_list',
      },
    });
  });

  it('cancel returns idempotent result when appointment already cancelled', async () => {
    appointmentModel.findByIdAndUserId.mockResolvedValue({ id: 11, appointStatus: 'cancelled' });

    const result = await appointmentService.cancel(1, 11);

    expect(result).toMatchObject({
      idempotent: true,
      source: 'local',
      appointment: { id: 11, appointStatus: 'cancelled' },
      diagnostics: { reason: 'cancel_idempotent_replay' },
    });
    expect(medicalApiService.cancelAppointment).not.toHaveBeenCalled();
  });

  it('cancel triggers upstream cancellation and updates local status', async () => {
    appointmentModel.findByIdAndUserId
      .mockResolvedValueOnce({ id: 12, appointStatus: 'confirmed', thirdPartyAppointId: 'tp-12' })
      .mockResolvedValueOnce({ id: 12, appointStatus: 'cancelled', thirdPartyAppointId: 'tp-12' });
    medicalApiService.cancelAppointment.mockResolvedValue({
      thirdPartyAppointId: 'tp-12',
      appointStatus: 'cancelled',
      cancelStatus: 'ok',
    });
    appointmentModel.updateStatus.mockResolvedValue(true);

    const result = await appointmentService.cancel(1, 12);

    expect(medicalApiService.cancelAppointment).toHaveBeenCalledWith({
      appointmentId: 12,
      thirdPartyAppointId: 'tp-12',
      requestId: 'cancel-12',
    });
    expect(appointmentModel.updateStatus).toHaveBeenCalledWith(12, 'cancelled');
    expect(result).toMatchObject({
      idempotent: false,
      source: 'third_party_live',
      appointment: { id: 12, appointStatus: 'cancelled', thirdPartyAppointId: 'tp-12' },
      diagnostics: { reason: 'appointment_cancelled' },
    });
  });

  it('cancel passes appointment idempotency key when present', async () => {
    appointmentModel.findByIdAndUserId
      .mockResolvedValueOnce({
        id: 22,
        appointStatus: 'confirmed',
        thirdPartyAppointId: 'tp-22',
        idempotencyKey: 'req-22',
      })
      .mockResolvedValueOnce({
        id: 22,
        appointStatus: 'cancelled',
        thirdPartyAppointId: 'tp-22',
        idempotencyKey: 'req-22',
      });
    medicalApiService.cancelAppointment.mockResolvedValue({
      thirdPartyAppointId: 'tp-22',
      appointStatus: 'cancelled',
      cancelStatus: 'ok',
    });
    appointmentModel.updateStatus.mockResolvedValue(true);

    await appointmentService.cancel(1, 22);

    expect(medicalApiService.cancelAppointment).toHaveBeenCalledWith({
      appointmentId: 22,
      thirdPartyAppointId: 'tp-22',
      requestId: 'req-22',
    });
  });

  it('cancel throws 409 for non-cancellable status', async () => {
    appointmentModel.findByIdAndUserId.mockResolvedValue({ id: 13, appointStatus: 'completed' });

    await expect(appointmentService.cancel(1, 13)).rejects.toMatchObject({
      code: 409,
      statusCode: 409,
    });
  });
});
