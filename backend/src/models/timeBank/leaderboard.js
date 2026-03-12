'use strict';

const { query } = require('./shared');

module.exports = {
  async getCommunityLeaderboard(communityId) {
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

};
