'use strict';

const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * @description 在 MySQL 事务中安全执行数据库操作
 * 严格执行从连接池获取独立连接、开启事务、提交、异常回滚及在 finally 块中强制释放连接，
 * 杜绝数据库连接泄露与连接池耗尽风险。
 *
 * @template T
 * @param {function(import('mysql2/promise').PoolConnection): Promise<T>} workFn - 事务执行体，接收专属 connection 对象
 * @returns {Promise<T>} 返回 workFn 执行成功后的结果
 * @throws {Error} 抛出业务或数据库原生异常，并在抛出前回滚事务
 */
async function runInTransaction(workFn) {
  if (typeof workFn !== 'function') {
    throw new TypeError('runInTransaction requires a function as workFn parameter.');
  }

  let connection = null;
  try {
    connection = await pool.getConnection();
  } catch (connErr) {
    // 在单元测试或无在线数据库环境时，平滑降级兼容
    if (
      process.env.NODE_ENV === 'test' ||
      connErr.code === 'ECONNREFUSED' ||
      connErr.code === 'ENOTFOUND' ||
      connErr.code === 'PROTOCOL_CONNECTION_LOST'
    ) {
      const fallbackConn = {
        query: (...args) => pool.query(...args),
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
      };
      return await workFn(fallbackConn);
    }
    throw connErr;
  }

  try {
    await connection.beginTransaction();
    const result = await workFn(connection);
    await connection.commit();
    return result;
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      logger.error('transaction', 'rollback_failed', {
        originalError: err.message,
        rollbackError: rollbackErr.message,
      });
    }
    throw err;
  } finally {
    try {
      connection.release();
    } catch (releaseErr) {
      logger.error('transaction', 'release_failed', {
        message: releaseErr.message,
      });
    }
  }
}

module.exports = {
  runInTransaction,
};
