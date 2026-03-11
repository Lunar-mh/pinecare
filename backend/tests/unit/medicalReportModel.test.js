'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/medicalReportModel');
  return { model, query: db.query };
};

describe('medicalReportModel', () => {
  it('upsertByReportNo serializes report data and returns latest saved record', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    query.mockResolvedValueOnce([
      [
        {
          id: 5,
          user_id: 9,
          report_no: 'REP-5',
          report_type: 'blood',
          report_date: '2026-03-01',
          report_url: 'https://example.com/rep-5',
          report_data: JSON.stringify({ hemoglobin: 128 }),
          sync_status: 'synced',
          created_at: '2026-03-11 09:00:00',
        },
      ],
    ]);

    const result = await model.upsertByReportNo({
      userId: '9',
      reportNo: 'REP-5',
      reportType: 'blood',
      reportDate: '2026-03-01',
      reportUrl: 'https://example.com/rep-5',
      reportData: { hemoglobin: 128 },
      syncStatus: 'synced',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO medical_reports'),
      [9, 'REP-5', 'blood', '2026-03-01', 'https://example.com/rep-5', '{"hemoglobin":128}', 'synced']
    );
    expect(result.reportData).toEqual({ hemoglobin: 128 });
    expect(result.reportNo).toBe('REP-5');
  });

  it('findByReportNo returns null when report is missing', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([[]]);

    await expect(model.findByReportNo('MISSING')).resolves.toBeNull();
  });

  it('batchUpsert maps snake_case payload and skips null saves', async () => {
    const { model } = loadModel();
    const spy = jest.spyOn(model, 'upsertByReportNo');

    spy
      .mockResolvedValueOnce({ id: 1, reportNo: 'A' })
      .mockResolvedValueOnce(null);

    const result = await model.batchUpsert('12', [
      {
        report_no: 'A',
        report_type: 'ct',
        report_date: '2026-03-02',
        report_url: 'https://example.com/a',
        report_data: { value: 1 },
        sync_status: 'synced',
      },
      {
        reportNo: 'B',
        reportType: 'mri',
        reportDate: '2026-03-03',
      },
    ]);

    expect(spy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 12,
        reportNo: 'A',
        reportType: 'ct',
        syncStatus: 'synced',
      })
    );
    expect(spy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 12,
        reportNo: 'B',
        reportType: 'mri',
        syncStatus: 'synced',
      })
    );
    expect(result).toEqual([{ id: 1, reportNo: 'A' }]);
  });

  it('listByUserId applies filters and tolerates invalid report_data JSON', async () => {
    const { model, query } = loadModel();

    query.mockResolvedValueOnce([
      [
        {
          id: 7,
          user_id: 15,
          report_no: 'REP-7',
          report_type: 'blood',
          report_date: '2026-03-05',
          report_url: null,
          report_data: 'bad-json',
          sync_status: 'pending',
          created_at: '2026-03-11 08:00:00',
        },
      ],
    ]);

    const result = await model.listByUserId(15, {
      reportType: 'blood',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report_date <= ?'),
      [15, 'blood', '2026-03-01', '2026-03-31']
    );
    expect(result).toEqual([
      expect.objectContaining({
        reportNo: 'REP-7',
        reportData: null,
      }),
    ]);
  });
});
