'use strict';

const fs = require('fs');
const path = require('path');
const { buildCompetitionSeedSqlBundle } = require('../src/data/competitionSeedSql');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'generated', 'competition-seed');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(outputDir, filename, content) {
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  fs.writeFileSync(path.join(outputDir, filename), normalized, 'utf8');
}

function writeJson(outputDir, filename, data) {
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function buildReadme(bundle) {
  const lines = [
    '# Competition Seed Bootstrap',
    '',
    `Generated at: ${bundle.generatedAt}`,
    `Manifest version: ${bundle.manifestVersion}`,
    '',
    '## Commands',
    '',
    ...COMPETITION_SEED_ASSETS.commands.map((command) => '- `' + command + '`'),
    '',
    '## Import Order',
    '',
    ...bundle.importOrder.map((tableName, index) => `${index + 1}. ${tableName}`),
    '',
    '## Counts',
    '',
    ...Object.entries(bundle.tableCounts).map(([tableName, count]) => `- ${tableName}: ${count}`),
    '',
    '## Import Tip',
    '',
    '- After running the SQL import, call `POST /admin/system/demo/bootstrap` to verify replay context and audit evidence.',
    '- Re-run `npm run seed:competition:export` if you need the matching JSON reference set for defense materials.',
    '',
  ];

  return lines.join('\n');
}

function generateCompetitionSeedSqlArtifacts(options = {}) {
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : DEFAULT_OUTPUT_DIR;
  const bundle = buildCompetitionSeedSqlBundle();
  ensureDir(outputDir);

  writeText(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSql, bundle.sql);
  writeText(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapReadme, buildReadme(bundle));
  writeJson(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSummary, {
    generatedAt: bundle.generatedAt,
    manifestVersion: bundle.manifestVersion,
    outputDir,
    outputFiles: bundle.outputFiles,
    importOrder: bundle.importOrder,
    clearOrder: bundle.clearOrder,
    tableCounts: bundle.tableCounts,
  });

  return {
    generatedAt: bundle.generatedAt,
    outputDir,
    outputFiles: bundle.outputFiles,
    tableCounts: bundle.tableCounts,
  };
}

function main() {
  const result = generateCompetitionSeedSqlArtifacts();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReadme,
  generateCompetitionSeedSqlArtifacts,
};
