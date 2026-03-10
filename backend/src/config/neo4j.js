'use strict';
// Neo4j 驱动桩（生产环境需安装 neo4j-driver 并配置真实连接）
module.exports = { driver: null, query: async () => ({ records: [] }) };
