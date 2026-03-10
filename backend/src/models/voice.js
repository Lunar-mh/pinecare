'use strict';

const { query } = require('../config/database');

class VoiceModel {
  static async createSession(userId) {
    const [result] = await query(
      `INSERT INTO voice_sessions (user_id, session_start, round_count)
       VALUES (?, NOW(), 0)`,
      [userId]
    );
    return result.insertId;
  }

  static async endSession(sessionId, userId) {
    const [result] = await query(
      `UPDATE voice_sessions
       SET session_end = NOW()
       WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
    return result.affectedRows > 0;
  }

  static async incrementRoundCount(sessionId) {
    const [result] = await query(
      `UPDATE voice_sessions
       SET round_count = round_count + 1
       WHERE id = ?`,
      [sessionId]
    );
    return result.affectedRows > 0;
  }

  static async createCommandLog({
    sessionId,
    userId,
    commandType,
    recognizedText = null,
    responseText = null,
    audioData = null,
    status = 'success',
  }) {
    const [result] = await query(
      `INSERT INTO voice_command_logs
        (session_id, user_id, command_type, recognized_text, response_text, audio_data, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, commandType, recognizedText, responseText, audioData, status]
    );
    return result.insertId;
  }

  static async getSessionById(sessionId) {
    const [rows] = await query(
      `SELECT id, user_id, session_start, session_end, round_count, created_at
       FROM voice_sessions
       WHERE id = ?
       LIMIT 1`,
      [sessionId]
    );
    return rows[0] || null;
  }

  static async getSessionByIdAndUser(sessionId, userId) {
    const [rows] = await query(
      `SELECT id, user_id, session_start, session_end, round_count, created_at
       FROM voice_sessions
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [sessionId, userId]
    );
    return rows[0] || null;
  }

  static async getSessionsByUser(userId, { limit, offset }) {
    const [rows] = await query(
      `SELECT id, user_id, session_start, session_end, round_count, created_at
       FROM voice_sessions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  static async countSessionsByUser(userId) {
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM voice_sessions
       WHERE user_id = ?`,
      [userId]
    );
    return rows[0] ? Number(rows[0].total) : 0;
  }

  static async getLogsBySession(sessionId, { limit, offset }) {
    const [rows] = await query(
      `SELECT id, session_id, user_id, command_type, recognized_text, response_text, audio_data, status, created_at
       FROM voice_command_logs
       WHERE session_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [sessionId, limit, offset]
    );
    return rows;
  }

  static async countLogsBySession(sessionId) {
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM voice_command_logs
       WHERE session_id = ?`,
      [sessionId]
    );
    return rows[0] ? Number(rows[0].total) : 0;
  }
}

module.exports = VoiceModel;
