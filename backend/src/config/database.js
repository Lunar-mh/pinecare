'use strict';

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 13307,
  user: process.env.DB_USER || 'yinban',
  password: process.env.DB_PASSWORD || 'yinban_password',
  database: process.env.DB_NAME || 'yinban',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

pool.on('error', (err) => {
  logger.error('database', 'pool_error', { message: err.message });
});

async function query(sql, params = []) {
  return pool.execute(sql, params);
}

async function closePool() {
  await pool.end();
}

module.exports = { closePool, pool, query };
