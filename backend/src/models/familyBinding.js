'use strict';

const { query } = require('../config/database');

class FamilyBindingModel {
  static async createQrcodeBinding(elderUserId, qrCode, qrExpiredAt) {
    const [result] = await query(
      `INSERT INTO family_bindings (elder_user_id, family_user_id, binding_status, qr_code, qr_expired_at)
       VALUES (?, NULL, 'pending', ?, ?)`,
      [elderUserId, qrCode, qrExpiredAt]
    );
    return this.findById(result.insertId);
  }

  static async createBindingRequest(elderUserId, familyUserId, qrCode, qrExpiredAt) {
    const [result] = await query(
      `INSERT INTO family_bindings (elder_user_id, family_user_id, binding_status, qr_code, qr_expired_at)
       VALUES (?, ?, 'pending', ?, ?)
       ON DUPLICATE KEY UPDATE
         binding_status = VALUES(binding_status),
         qr_code = VALUES(qr_code),
         qr_expired_at = VALUES(qr_expired_at),
         approved_at = NULL,
         rejected_at = NULL,
         created_at = CURRENT_TIMESTAMP`,
      [elderUserId, familyUserId, qrCode, qrExpiredAt]
    );
    return this.findById(result.insertId || 0);
  }

  static async findByQrCode(qrCode) {
    const [rows] = await query(
      `SELECT id, elder_user_id, family_user_id, binding_status, qr_code, qr_expired_at,
              approved_at, rejected_at, created_at
       FROM family_bindings
       WHERE qr_code = ?
       ORDER BY id DESC
       LIMIT 1`,
      [qrCode]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await query(
      `SELECT id, elder_user_id, family_user_id, binding_status, qr_code, qr_expired_at,
              approved_at, rejected_at, created_at
       FROM family_bindings
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async updateStatus(bindingId, status) {
    const approvedAt = status === 'approved' ? new Date() : null;
    const rejectedAt = status === 'rejected' ? new Date() : null;

    const [result] = await query(
      `UPDATE family_bindings
       SET binding_status = ?,
           approved_at = ?,
           rejected_at = ?
       WHERE id = ? AND binding_status = 'pending'`,
      [status, approvedAt, rejectedAt, bindingId]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(bindingId);
  }

  static async listApprovedFamilyReceiverIds(elderUserId) {
    const [rows] = await query(
      `SELECT u.id AS family_user_id
       FROM family_bindings fb
       INNER JOIN users u ON u.id = fb.family_user_id
       WHERE fb.elder_user_id = ?
         AND fb.binding_status = 'approved'
         AND u.openid IS NOT NULL`,
      [elderUserId]
    );

    return rows.map((item) => Number(item.family_user_id));
  }
}

module.exports = FamilyBindingModel;
