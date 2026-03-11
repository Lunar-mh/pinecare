'use strict';

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
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
