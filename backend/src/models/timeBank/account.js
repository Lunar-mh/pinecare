'use strict';

const { pool, query, getCreditLevelByScore } = require('./shared');

module.exports = {
  async getOrCreateAccountByUserId(userId) {
    const uid = Number(userId);
    if (!uid) {
      throw new Error('userId 非法');
    }

    await query(
      `INSERT INTO time_accounts (user_id, balance, total_earned, total_spent, credit_score, credit_level)
       VALUES (?, 0, 0, 0, 100, 'angel')
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
      [uid]
    );

    const [rows] = await query(
      `SELECT id, user_id, balance, total_earned, total_spent, credit_score, credit_level, created_at, updated_at
       FROM time_accounts
       WHERE user_id = ?
       LIMIT 1`,
      [uid]
    );

    return rows[0] || null;
  },

  async updateAccountBalance(userId, coins, type) {
    const uid = Number(userId);
    const amount = Number(coins);

    if (!uid || !amount || amount < 0) {
      throw new Error('更新时间币余额参数非法');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO time_accounts (user_id, balance, total_earned, total_spent, credit_score, credit_level)
         VALUES (?, 0, 0, 0, 100, 'angel')
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
        [uid]
      );

      const [rows] = await conn.execute(
        `SELECT id, user_id, balance, total_earned, total_spent, credit_score
         FROM time_accounts
         WHERE user_id = ?
         FOR UPDATE`,
        [uid]
      );

      if (rows.length === 0) {
        throw new Error('账户不存在');
      }

      const account = rows[0];
      let nextBalance = Number(account.balance);
      let nextTotalEarned = Number(account.total_earned);
      let nextTotalSpent = Number(account.total_spent);
      let nextCreditScore = Number(account.credit_score);

      if (type === 'earn') {
        nextBalance += amount;
        nextTotalEarned += amount;
        nextCreditScore = Math.min(100, nextCreditScore + 1);
      } else if (type === 'spend') {
        if (nextBalance < amount) {
          const balanceErr = new Error('账户余额不足');
          balanceErr.statusCode = 409;
          throw balanceErr;
        }
        nextBalance -= amount;
        nextTotalSpent += amount;
        nextCreditScore = Math.max(0, nextCreditScore - 1);
      } else {
        throw new Error('不支持的余额变更类型');
      }

      const nextCreditLevel = getCreditLevelByScore(nextCreditScore);

      await conn.execute(
        `UPDATE time_accounts
         SET balance = ?, total_earned = ?, total_spent = ?, credit_score = ?, credit_level = ?
         WHERE user_id = ?`,
        [nextBalance, nextTotalEarned, nextTotalSpent, nextCreditScore, nextCreditLevel, uid]
      );

      await conn.commit();

      return {
        userId: uid,
        balance: nextBalance,
        totalEarned: nextTotalEarned,
        totalSpent: nextTotalSpent,
        creditScore: nextCreditScore,
        creditLevel: nextCreditLevel,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
