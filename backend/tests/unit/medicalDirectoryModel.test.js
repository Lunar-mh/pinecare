'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/medicalDirectoryModel');
  return { model, query: db.query };
};

describe('medicalDirectoryModel', () => {
  it('getHospitals ensures cache table and parses payload rows', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ warningStatus: 0 }]);
    query.mockResolvedValueOnce([
      [
        {
          business_key: 'h-1',
          name: '默认医院',
          hospital_id: 1,
          department_id: null,
          payload: JSON.stringify({ id: 'custom-id', name: '协和医院', level: '3A' }),
          updated_at: '2026-03-11 09:00:00',
        },
        {
          business_key: 'h-2',
          name: '第二医院',
          hospital_id: 2,
          department_id: null,
          payload: 'not-json',
          updated_at: '2026-03-11 10:00:00',
        },
      ],
    ]);

    const result = await model.getHospitals();

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('CREATE TABLE IF NOT EXISTS'));
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("WHERE directory_type = 'hospital'"));
    expect(result).toEqual([
      {
        id: 'custom-id',
        name: '协和医院',
        level: '3A',
        hospitalId: 1,
        departmentId: null,
        updatedAt: '2026-03-11 09:00:00',
      },
      {
        id: 'h-2',
        name: '第二医院',
        hospitalId: 2,
        departmentId: null,
        updatedAt: '2026-03-11 10:00:00',
      },
    ]);
  });

  it('refreshDepartments deletes old cache and inserts normalized rows', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ warningStatus: 0 }]);
    query.mockResolvedValueOnce([{ affectedRows: 2 }]);
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await model.refreshDepartments(5, [
      { departmentId: 20, departmentName: '内科' },
      { departmentId: 21, departmentName: ' ' },
    ]);

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM medical_directory_cache"),
      [5]
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO medical_directory_cache'),
      ['department', '20', '内科', 5, 20, JSON.stringify({ departmentId: 20, departmentName: '内科' })]
    );
  });

  it('findDoctorById returns null when cache miss occurs', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ warningStatus: 0 }]);
    query.mockResolvedValueOnce([[]]);

    await expect(model.findDoctorById('doctor-1')).resolves.toBeNull();
  });

  it('upsertDoctor normalizes scope ids before writing cache', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ warningStatus: 0 }]);
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await model.upsertDoctor({
      doctorId: 77,
      doctorName: '张医生',
      hospitalId: '9',
      departmentId: '11',
      title: '主任医师',
    });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO medical_directory_cache'),
      ['doctor', '77', '张医生', 9, 11, JSON.stringify({
        doctorId: 77,
        doctorName: '张医生',
        hospitalId: '9',
        departmentId: '11',
        title: '主任医师',
      })]
    );
  });
});
