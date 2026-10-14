'use strict';

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// 根据环境调整连接池大小
const isProduction = process.env.NODE_ENV === 'production';
const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT, 10) || (isProduction ? 50 : 10);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 13307,
  user: process.env.DB_USER || 'yinban',
  password: process.env.DB_PASSWORD || 'yinban_password',
  database: process.env.DB_NAME || 'yinban',
  waitForConnections: true,
  connectionLimit,
  queueLimit: 100, // 限制等待队列长度，防止内存溢出
  charset: 'utf8mb4',
  // 生产环境优化
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  acquireTimeout: 30000,
});

if (typeof pool.on === 'function') {
  pool.on('error', (err) => {
    logger.error('database', 'pool_error', { message: err.message });
  });

  pool.on('connection', (connection) => {
    logger.info('database', 'pool_connection', { threadId: connection.threadId || null });
  });

  pool.on('acquire', (connection) => {
    logger.info('database', 'pool_acquire', { threadId: connection.threadId || null });
  });

  pool.on('release', (connection) => {
    logger.info('database', 'pool_release', { threadId: connection.threadId || null });
  });

  pool.on('enqueue', () => {
    logger.warn('database', 'pool_enqueue', { detail: 'Waiting for available database connection.' });
  });
}

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function closePool() {
  await pool.end();
}

module.exports = { closePool, pool, query };

