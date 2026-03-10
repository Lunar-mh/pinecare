'use strict';

const { query } = require('../config/database');

function formatTrackDate(input) {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  if (input instanceof Date) {
    return input.toISOString().slice(0, 10);
  }

  const text = String(input).trim();
  return text.slice(0, 10);
}

class CompanionModel {
  /**
   * 创建聊天/怀旧会话记录
   * @param {object} payload
   * @returns {Promise<number>}
   */
  static async createChatSession(payload) {
    const {
      userId,
      message,
      reply,
      emotionScore,
      sessionType = 'chat',
    } = payload;

    const [result] = await query(
      `INSERT INTO companion_sessions (user_id, message, reply, emotion_score, session_type)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, message, reply, emotionScore, sessionType]
    );

    return result.insertId;
  }

  /**
   * 写入游戏成绩
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<number>}
   */
  static async createGameRecord(userId, payload) {
    const { gameType, score, difficulty, durationSeconds } = payload;

    const [result] = await query(
      `INSERT INTO game_records (user_id, game_type, score, difficulty, duration_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, gameType, score, difficulty, durationSeconds]
    );

    return result.insertId;
  }

  /**
   * 查询用户游戏成绩
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Array<object>>}
   */
  static async listGameRecordsByUser(userId, limit = 20) {
    const [rows] = await query(
      `SELECT id, user_id, game_type, score, difficulty, duration_seconds, created_at
       FROM game_records
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows;
  }

  /**
   * 按天累加情绪得分
   * @param {number} userId
   * @param {string|Date} trackDate
   * @param {number} emotionScore
   * @returns {Promise<void>}
   */
  static async upsertEmotionTrackByDate(userId, trackDate, emotionScore) {
    const dateText = formatTrackDate(trackDate);
    const score = Number(emotionScore);

    await query(
      `INSERT INTO emotion_tracks (user_id, track_date, avg_score, record_count)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         avg_score = ROUND(((avg_score * record_count) + VALUES(avg_score)) / (record_count + 1), 2),
         record_count = record_count + 1`,
      [userId, dateText, score]
    );
  }

  /**
   * 查询近 N 天情绪趋势
   * @param {number} userId
   * @param {number} days
   * @returns {Promise<Array<object>>}
   */
  static async getEmotionTracksByDays(userId, days = 30) {
    const windowDays = Math.max(1, Number(days) || 30);

    const [rows] = await query(
      `SELECT track_date, avg_score, record_count
       FROM emotion_tracks
       WHERE user_id = ?
         AND track_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY track_date ASC`,
      [userId, windowDays - 1]
    );

    return rows;
  }
}

module.exports = CompanionModel;
