'use strict';

const { pool, query } = require('../config/db');
const { generateRecordHash } = require('../utils/hashChain');

const ZERO_HASH = '0'.repeat(64);

/**
 * 根据信用分映射信用等级
 * @param {number} creditScore
 * @returns {'new'|'silver'|'gold'|'angel'}
 */
function getCreditLevelByScore(creditScore) {
  const score = Math.max(0, Math.min(100, Number(creditScore) || 0));

  if (score >= 95) return 'angel';
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  return 'new';
}

class TimeBankModel {
  /**
   * 账户不存在时自动创建
   * @param {number} userId
   * @returns {Promise<object>}
   */
  static async getOrCreateAccountByUserId(userId) {
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
  }

  /**
   * 获取最新服务记录哈希
   * @returns {Promise<string>}
   */
  static async getLatestRecordHash() {
    const [rows] = await query(
      `SELECT record_hash
       FROM service_records
       ORDER BY id DESC
       LIMIT 1`
    );

    return rows.length > 0 ? rows[0].record_hash : ZERO_HASH;
  }

  /**
   * 创建待确认服务记录，并计算 prev_hash/record_hash
   * @param {object} data
   * @returns {Promise<object>}
   */
  static async createServiceRecord(data) {
    const prevHash = await this.getLatestRecordHash();

    const payload = {
      prev_hash: prevHash,
      provider_id: Number(data.providerId),
      recipient_id: Number(data.recipientId),
      service_type: data.serviceType,
      start_time: data.startTime,
      end_time: data.endTime,
      duration_hours: Number(data.durationHours),
      time_coins: Number(data.timeCoins),
      location_hash: data.locationHash || null,
      status: 'pending',
    };

    const recordHash = generateRecordHash(payload);

    const [result] = await query(
      `INSERT INTO service_records (
         record_hash,
         prev_hash,
         provider_id,
         recipient_id,
         service_type,
         start_time,
         end_time,
         duration_hours,
         time_coins,
         location_hash,
         status,
         provider_signature,
         recipient_signature,
         platform_signature
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, NULL)`,
      [
        recordHash,
        prevHash,
        payload.provider_id,
        payload.recipient_id,
        payload.service_type,
        payload.start_time,
        payload.end_time,
        payload.duration_hours,
        payload.time_coins,
        payload.location_hash,
      ]
    );

    return {
      id: result.insertId,
      recordHash,
      prevHash,
      status: 'pending',
      timeCoins: payload.time_coins,
    };
  }

  /**
   * 按 ID 查询服务记录
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  static async getServiceRecordById(id) {
    const [rows] = await query(
      `SELECT id, record_hash, prev_hash, provider_id, recipient_id, service_type,
              start_time, end_time, duration_hours, time_coins, location_hash,
              status, provider_signature, recipient_signature, platform_signature, created_at
       FROM service_records
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * 更新服务记录状态与签名
   * @param {number} id
   * @param {'confirmed'|'cancelled'} status
   * @param {{providerSignature?: string, recipientSignature?: string, platformSignature?: string}} signatures
   * @returns {Promise<boolean>}
   */
  static async updateServiceRecordStatus(id, status, signatures = {}) {
    const [result] = await query(
      `UPDATE service_records
       SET status = ?,
           provider_signature = ?,
           recipient_signature = ?,
           platform_signature = ?
       WHERE id = ?`,
      [
        status,
        signatures.providerSignature || null,
        signatures.recipientSignature || null,
        signatures.platformSignature || null,
        id,
      ]
    );

    return result.affectedRows > 0;
  }

  /**
   * 原子更新服务记录状态并在确认时结算时间币
   * @param {number} recordId
   * @param {'confirm'|'cancel'} action
   * @param {{providerSignature?: string, recipientSignature?: string, platformSignature?: string}} signatures
   * @returns {Promise<{record: object, account: object|null}>}
   */
  static async settleServiceRecord(recordId, action, signatures = {}) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [recordRows] = await conn.execute(
        `SELECT id, provider_id, recipient_id, time_coins, status
         FROM service_records
         WHERE id = ?
         FOR UPDATE`,
        [recordId]
      );

      if (recordRows.length === 0) {
        const notFoundErr = new Error('服务记录不存在');
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }

      const lockedRecord = recordRows[0];
      if (lockedRecord.status !== 'pending') {
        const statusErr = new Error('仅 pending 状态可确认或取消');
        statusErr.statusCode = 409;
        throw statusErr;
      }

      const nextStatus = action === 'confirm' ? 'confirmed' : 'cancelled';

      await conn.execute(
        `UPDATE service_records
         SET status = ?,
             provider_signature = ?,
             recipient_signature = ?,
             platform_signature = ?
         WHERE id = ?`,
        [
          nextStatus,
          signatures.providerSignature || null,
          signatures.recipientSignature || null,
          signatures.platformSignature || null,
          recordId,
        ]
      );

      let accountSnapshot = null;
      if (nextStatus === 'confirmed') {
        await conn.execute(
          `INSERT INTO time_accounts (user_id, balance, total_earned, total_spent, credit_score, credit_level)
           VALUES (?, 0, 0, 0, 100, 'angel')
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
          [lockedRecord.provider_id]
        );

        const [accountRows] = await conn.execute(
          `SELECT balance, total_earned, total_spent, credit_score
           FROM time_accounts
           WHERE user_id = ?
           FOR UPDATE`,
          [lockedRecord.provider_id]
        );

        const account = accountRows[0];
        const nextBalance = Number(account.balance) + Number(lockedRecord.time_coins);
        const nextTotalEarned = Number(account.total_earned) + Number(lockedRecord.time_coins);
        const nextTotalSpent = Number(account.total_spent);
        const nextCreditScore = Math.min(100, Number(account.credit_score) + 1);
        const nextCreditLevel = getCreditLevelByScore(nextCreditScore);

        await conn.execute(
          `UPDATE time_accounts
           SET balance = ?, total_earned = ?, total_spent = ?, credit_score = ?, credit_level = ?
           WHERE user_id = ?`,
          [
            nextBalance,
            nextTotalEarned,
            nextTotalSpent,
            nextCreditScore,
            nextCreditLevel,
            lockedRecord.provider_id,
          ]
        );

        accountSnapshot = {
          userId: Number(lockedRecord.provider_id),
          balance: nextBalance,
          totalEarned: nextTotalEarned,
          totalSpent: nextTotalSpent,
          creditScore: nextCreditScore,
          creditLevel: nextCreditLevel,
        };
      }

      await conn.commit();

      return {
        record: {
          id: Number(lockedRecord.id),
          providerId: Number(lockedRecord.provider_id),
          recipientId: Number(lockedRecord.recipient_id),
          timeCoins: Number(lockedRecord.time_coins),
          status: nextStatus,
        },
        account: accountSnapshot,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * 原子更新余额与累计统计
   * @param {number} userId
   * @param {number} coins
   * @param {'earn'|'spend'} type
   * @returns {Promise<object>}
   */
  static async updateAccountBalance(userId, coins, type) {
    const uid = Number(userId);
    const amount = Number(coins);

    if (!uid || !amount || amount < 0) {
      throw new Error('更新余额参数非法');
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
  }

  /**
   * 查询服务历史（支持 provided/received 与分页）
   * @param {number} userId
   * @param {'provided'|'received'} type
   * @param {number} page
   * @param {number} pageSize
   * @returns {Promise<{list: Array, pagination: object}>}
   */
  static async listServiceHistory(userId, type, page = 1, pageSize = 10) {
    const uid = Number(userId);
    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.max(1, Math.min(100, Number(pageSize) || 10));
    const offset = (pageNum - 1) * size;

    const whereField = type === 'received' ? 'recipient_id' : 'provider_id';

    const [countRows] = await query(
      `SELECT COUNT(1) AS total
       FROM service_records
       WHERE ${whereField} = ?`,
      [uid]
    );

    const [rows] = await query(
      `SELECT id, record_hash, prev_hash, provider_id, recipient_id, service_type,
              start_time, end_time, duration_hours, time_coins, location_hash,
              status, provider_signature, recipient_signature, platform_signature, created_at
       FROM service_records
       WHERE ${whereField} = ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [uid, size, offset]
    );

    const total = Number((countRows[0] && countRows[0].total) || 0);

    return {
      list: rows,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  /**
   * 查询兑换历史
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  static async listExchangeHistory(userId) {
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
  static async listExchangeHistoryByUser(userId) {
    return this.listExchangeHistory(userId);
  }

  /**
   * 创建兑换记录并扣减余额（事务）
   * @param {number} userId
   * @param {{ exchangeType: string, itemName: string, coinsRequired: number }} payload
   * @returns {Promise<object>}
   */
  static async createExchangeRecord(userId, payload) {
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
  static async getCommunityLeaderboard(communityId) {
    const cid = communityId === undefined || communityId === null ? null : Number(communityId);

    // 优先尝试按用户社区维度查询，若 users 表不存在则退化为全站排行
    try {
      if (cid) {
        const [rows] = await query(
          `SELECT ta.user_id, ta.balance, ta.total_earned, ta.credit_score, ta.credit_level
           FROM time_accounts ta
           INNER JOIN users u ON u.id = ta.user_id
           WHERE u.community_id = ?
           ORDER BY ta.balance DESC, ta.total_earned DESC, ta.id ASC
           LIMIT 100`,
          [cid]
        );
        return rows;
      }
    } catch (err) {
      // users 表不存在时忽略，降级到全站排行
      if (err && err.code !== 'ER_NO_SUCH_TABLE') {
        throw err;
      }
    }

    const [rows] = await query(
      `SELECT user_id, balance, total_earned, credit_score, credit_level
       FROM time_accounts
       ORDER BY balance DESC, total_earned DESC, id ASC
       LIMIT 100`
    );

    return rows;
  }
}

module.exports = TimeBankModel;
