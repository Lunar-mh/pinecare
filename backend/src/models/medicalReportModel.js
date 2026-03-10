'use strict';

const { query } = require('../config/database');

function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

function mapRow(row) {
  let reportData = row.report_data;

  if (typeof reportData === 'string') {
    try {
      reportData = JSON.parse(reportData);
    } catch (error) {
      reportData = null;
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    reportNo: row.report_no,
    reportType: row.report_type,
    reportDate: row.report_date,
    reportUrl: row.report_url,
    reportData,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
  };
}

const medicalReportModel = {
  /**
   * 按报告编号幂等写入（upsert）
   * @param {object} payload
   * @returns {Promise<object|null>}
   */
  async upsertByReportNo(payload) {
    await query(
      `INSERT INTO medical_reports
       (user_id, report_no, report_type, report_date, report_url, report_data, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         report_type = VALUES(report_type),
         report_date = VALUES(report_date),
         report_url = VALUES(report_url),
         report_data = VALUES(report_data),
         sync_status = VALUES(sync_status)`,
      [
        Number(payload.userId),
        payload.reportNo,
        payload.reportType,
        payload.reportDate,
        payload.reportUrl || null,
        payload.reportData ? JSON.stringify(payload.reportData) : null,
        payload.syncStatus || 'pending',
      ]
    );

    return this.findByReportNo(payload.reportNo);
  },

  /**
   * 根据报告编号查询
   * @param {string} reportNo
   * @returns {Promise<object|null>}
   */
  async findByReportNo(reportNo) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, report_no, report_type, report_date, report_url, report_data, sync_status, created_at
         FROM medical_reports
         WHERE report_no = ?
         LIMIT 1`,
        [String(reportNo)]
      )
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  },

  /**
   * 批量同步报告
   * @param {number|string} userId
   * @param {Array<object>} reports
   * @returns {Promise<Array<object>>}
   */
  async batchUpsert(userId, reports) {
    if (!Array.isArray(reports) || reports.length === 0) {
      return [];
    }

    const result = [];

    for (const report of reports) {
      const saved = await this.upsertByReportNo({
        userId: Number(userId),
        reportNo: String(report.reportNo || report.report_no || ''),
        reportType: String(report.reportType || report.report_type || '未知'),
        reportDate: report.reportDate || report.report_date,
        reportUrl: report.reportUrl || report.report_url || null,
        reportData: report.reportData || report.report_data || null,
        syncStatus: report.syncStatus || report.sync_status || 'synced',
      });

      if (saved) {
        result.push(saved);
      }
    }

    return result;
  },

  /**
   * 按用户查询报告
   * @param {number|string} userId
   * @param {{reportType?:string,startDate?:string,endDate?:string}} filters
   * @returns {Promise<Array<object>>}
   */
  async listByUserId(userId, filters = {}) {
    const conditions = ['user_id = ?'];
    const params = [Number(userId)];

    if (filters.reportType) {
      conditions.push('report_type = ?');
      params.push(String(filters.reportType));
    }

    if (filters.startDate) {
      conditions.push('report_date >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('report_date <= ?');
      params.push(filters.endDate);
    }

    const rows = unwrap(
      await query(
        `SELECT id, user_id, report_no, report_type, report_date, report_url, report_data, sync_status, created_at
         FROM medical_reports
         WHERE ${conditions.join(' AND ')}
         ORDER BY report_date DESC, id DESC`,
        params
      )
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = medicalReportModel;
