'use strict';

const path = require('path');
const { buildCompetitionSeedDataset } = require('./competitionSeedDataset');
const { COMPETITION_SEED_ASSETS } = require('./competitionSeedAssets');
const { INSERT_ORDER, CLEAR_ORDER, buildInsert, toMysqlDateTime } = require('./competitionSeedSql/shared');
const { buildTableRows } = require('./competitionSeedSql/rowBuilders');

function buildStatements(tableRows) {
  return [
    '-- competition seed bootstrap generated for the Yinban contest backend',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    'START TRANSACTION;',
    '',
    '-- cleanup existing competition data in reverse dependency order',
    ...CLEAR_ORDER.map((tableName) => `DELETE FROM ${tableName};`),
    '',
    '-- insert deterministic baseline rows',
    ...INSERT_ORDER.map((tableName) => {
      const rows = tableRows[tableName] || [];
      if (!rows.length) {
        return `-- ${tableName}: no rows`;
      }
      const columns = Object.keys(rows[0]);
      return buildInsert(tableName, columns, rows).trimEnd();
    }),
    '',
    'COMMIT;',
    'SET FOREIGN_KEY_CHECKS = 1;',
    '',
  ].join('\n');
}

function buildCompetitionSeedSqlBundle(dataset = buildCompetitionSeedDataset()) {
  const tableRows = buildTableRows(dataset);
  const sql = buildStatements(tableRows);
  const tableCounts = Object.fromEntries(
    Object.entries(tableRows).map(([tableName, rows]) => [tableName, rows.length])
  );

  return {
    generatedAt: new Date().toISOString(),
    manifestVersion: dataset.manifest.version,
    outputDir: COMPETITION_SEED_ASSETS.outputDir,
    outputFiles: {
      sql: path.posix.join(COMPETITION_SEED_ASSETS.outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSql),
      readme: path.posix.join(
        COMPETITION_SEED_ASSETS.outputDir,
        COMPETITION_SEED_ASSETS.files.bootstrapReadme
      ),
      summary: path.posix.join(
        COMPETITION_SEED_ASSETS.outputDir,
        COMPETITION_SEED_ASSETS.files.bootstrapSummary
      ),
    },
    importOrder: INSERT_ORDER,
    clearOrder: CLEAR_ORDER,
    tableCounts,
    sql,
  };
}

module.exports = {
  buildCompetitionSeedSqlBundle,
  buildTableRows,
  toMysqlDateTime,
};
