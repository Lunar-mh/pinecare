'use strict';

const { pool, query, generateRecordHash, ZERO_HASH, getCreditLevelByScore } = require('./shared');

module.exports = {
  async getLatestRecordHash() {
    const [rows] = await query(
      `SELECT record_hash
       FROM service_records
       ORDER BY id DESC
       LIMIT 1`
    );

    return rows.length > 0 ? rows[0].record_hash : ZERO_HASH;
  },

  async createServiceRecord(data) {
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
  },

  async getServiceRecordById(id) {
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
  },

  async updateServiceRecordStatus(id, status, signatures = {}) {
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
  },

  async settleServiceRecord(recordId, action, signatures = {}) {
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
  },

  async listServiceHistory(userId, type, page = 1, pageSize = 10) {
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
  },
};
