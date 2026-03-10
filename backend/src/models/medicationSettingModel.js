'use strict';

const { query } = require('../config/database');

const DEFAULT_SETTINGS = {
  reminder_enabled: 1,
  family_sync_enabled: 0,
  sleep_start: '22:00:00',
  sleep_end: '06:00:00',
};

function mapSettingRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    reminder_enabled: Number(row.reminder_enabled),
    family_sync_enabled: Number(row.family_sync_enabled),
    sleep_start: row.sleep_start,
    sleep_end: row.sleep_end,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const medicationSettingModel = {
  DEFAULT_SETTINGS,

  async getByUserId(userId) {
    const [rows] = await query(
      `SELECT id, user_id, reminder_enabled, family_sync_enabled, sleep_start, sleep_end,
              created_at, updated_at
       FROM medication_settings
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    return mapSettingRow(rows[0] || null);
  },

  async getOrCreateByUserId(userId) {
    await query(
      `INSERT INTO medication_settings (user_id, reminder_enabled, family_sync_enabled, sleep_start, sleep_end)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
      [
        userId,
        DEFAULT_SETTINGS.reminder_enabled,
        DEFAULT_SETTINGS.family_sync_enabled,
        DEFAULT_SETTINGS.sleep_start,
        DEFAULT_SETTINGS.sleep_end,
      ]
    );

    return this.getByUserId(userId);
  },

  async upsertByUserId(userId, payload) {
    await query(
      `INSERT INTO medication_settings (user_id, reminder_enabled, family_sync_enabled, sleep_start, sleep_end)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         reminder_enabled = VALUES(reminder_enabled),
         family_sync_enabled = VALUES(family_sync_enabled),
         sleep_start = VALUES(sleep_start),
         sleep_end = VALUES(sleep_end),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        payload.reminder_enabled,
        payload.family_sync_enabled,
        payload.sleep_start,
        payload.sleep_end,
      ]
    );

    return this.getByUserId(userId);
  },
};

module.exports = medicationSettingModel;
