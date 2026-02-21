'use strict';

const mysql = require('mysql2/promise');

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
  console.error('MySQL 连接池错误:', err.message);
});

/**
 * 执行 SQL 查询的辅助函数
 * @param {string} sql - SQL 语句
 * @param {Array} params - 参数列表
 * @returns {Promise<[rows, fields]>}
 */
async function query(sql, params = []) {
  return pool.execute(sql, params);
}

module.exports = { pool, query };
