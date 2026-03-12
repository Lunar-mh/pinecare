'use strict';

const { pool, query } = require('./shared');

module.exports = {
  async listExchangeHistory(userId) {
    const [rows] = await query(
      `SELECT id, user_id, exchange_type, item_name, coins_required, status, created_at, completed_at
       FROM exchange_records
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );

    return rows;
  }

  /**
   * 兑换历史别名方法（兼容任务命名）
   * @param {number} userId
   * @returns {Promise<Array>}
   */

  async listExchangeHistoryByUser(userId) {
    return this.listExchangeHistory(userId);
  }

  /**
   * 创建兑换记录并扣减余额（事务）
   * @param {number} userId
   * @param {{ exchangeType: string, itemName: string, coinsRequired: number }} payload
   * @returns {Promise<object>}
   */

  async createExchangeRecord(userId, payload) {
    const uid = Number(userId);
    const coins = Number(payload.coinsRequired);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO time_accounts (user_id, balance, total_earned, total_spent, credit_score, credit_level)
         VALUES (?, 0, 0, 0, 100, 'angel')
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
        [uid]
      );

      const [accountRows] = await conn.execute(
        `SELECT balance
         FROM time_accounts
         WHERE user_id = ?
         FOR UPDATE`,
        [uid]
      );

      const balance = Number((accountRows[0] && accountRows[0].balance) || 0);
      if (balance < coins) {
        const err = new Error('时间币余额不足');
        err.statusCode = 409;
        throw err;
      }

      await conn.execute(
        `UPDATE time_accounts
         SET balance = balance - ?, total_spent = total_spent + ?,
             credit_score = GREATEST(0, credit_score - 1),
             credit_level = CASE
               WHEN GREATEST(0, credit_score - 1) >= 95 THEN 'angel'
               WHEN GREATEST(0, credit_score - 1) >= 80 THEN 'gold'
               WHEN GREATEST(0, credit_score - 1) >= 60 THEN 'silver'
               ELSE 'new'
             END
         WHERE user_id = ?`,
        [coins, coins, uid]
      );

      const [result] = await conn.execute(
        `INSERT INTO exchange_records (user_id, exchange_type, item_name, coins_required, status, completed_at)
         VALUES (?, ?, ?, ?, 'completed', NOW())`,
        [uid, payload.exchangeType, payload.itemName, coins]
      );

      await conn.commit();

      return {
        id: result.insertId,
        userId: uid,
        exchangeType: payload.exchangeType,
        itemName: payload.itemName,
        coinsRequired: coins,
        status: 'completed',
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * 查询社区排行榜（余额降序）
   * @param {number|string} communityId
   * @returns {Promise<Array>}
   */

};
