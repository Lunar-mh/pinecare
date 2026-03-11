'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/appointmentModel');
  return { model, query: db.query };
};

describe('appointmentModel', () => {
  it('create inserts record and returns the saved appointment', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ insertId: 12 }]);
    query.mockResolvedValueOnce([
      [
        {
          id: 12,
          user_id: 1001,
          hospital_id: 8,
          department: '心内科',
          doctor_id: 88,
          appointment_date: '2026-03-20',
          time_slot: '09:00-10:00',
          appoint_status: 'confirmed',
          third_party_appoint_id: 'tp-12',
          idempotency_key: 'idem-12',
          created_at: '2026-03-11 12:00:00',
        },
      ],
    ]);

    const result = await model.create({
      userId: '1001',
      hospitalId: '8',
      department: '心内科',
      doctorId: '88',
      appointmentDate: '2026-03-20',
      timeSlot: '09:00-10:00',
      appointStatus: 'confirmed',
      thirdPartyAppointId: 'tp-12',
      idempotencyKey: 'idem-12',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO appointments'),
      [1001, 8, '心内科', 88, '2026-03-20', '09:00-10:00', 'confirmed', 'tp-12', 'idem-12']
    );
    expect(result).toEqual({
      id: 12,
      userId: 1001,
      hospitalId: 8,
      department: '心内科',
      doctorId: 88,
      appointmentDate: '2026-03-20',
      timeSlot: '09:00-10:00',
      appointStatus: 'confirmed',
      thirdPartyAppointId: 'tp-12',
      idempotencyKey: 'idem-12',
      createdAt: '2026-03-11 12:00:00',
    });
  });

  it('findByIdAndUserId maps database row into API shape', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([
      [
        {
          id: 3,
          user_id: 9,
          hospital_id: 2,
          department: '骨科',
          doctor_id: 6,
          appointment_date: '2026-03-18',
          time_slot: '14:00-15:00',
          appoint_status: 'pending',
          third_party_appoint_id: null,
          idempotency_key: 'idem-3',
          created_at: '2026-03-10 08:00:00',
        },
      ],
    ]);

    const result = await model.findByIdAndUserId('3', '9');

    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE id = ? AND user_id = ?'), [3, 9]);
    expect(result.doctorId).toBe(6);
    expect(result.idempotencyKey).toBe('idem-3');
  });

  it('findByIdempotencyKey returns null when no appointment exists', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([[]]);

    await expect(model.findByIdempotencyKey('missing-key')).resolves.toBeNull();
  });

  it('updateStatus returns whether the row was updated', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(model.updateStatus(5, 'cancelled')).resolves.toBe(true);

    query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await expect(model.updateStatus(5, 'cancelled')).resolves.toBe(false);
  });

  it('listByUserId applies trimmed status and clamps pagination', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([[{ total: 23 }]]);
    query.mockResolvedValueOnce([
      [
        {
          id: 1,
          user_id: 77,
          hospital_id: 9,
          department: '神经内科',
          doctor_id: 10,
          appointment_date: '2026-03-21',
          time_slot: '10:00-11:00',
          appoint_status: 'cancelled',
          third_party_appoint_id: 'tp-1',
          idempotency_key: 'idem-1',
          created_at: '2026-03-11 10:00:00',
        },
      ],
    ]);

    const result = await model.listByUserId(77, {
      status: ' cancelled ',
      page: '0',
      pageSize: '999',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT COUNT(1) AS total'),
      [77, 'cancelled']
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT ? OFFSET ?'),
      [77, 'cancelled', 100, 0]
    );
    expect(result).toEqual({
      list: [
        expect.objectContaining({
          id: 1,
          appointStatus: 'cancelled',
        }),
      ],
      page: 1,
      pageSize: 100,
      total: 23,
    });
  });
});
