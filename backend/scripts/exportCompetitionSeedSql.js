'use strict';

const fs = require('fs');
const path = require('path');
const { buildCompetitionSeedSqlBundle } = require('../src/data/competitionSeedSql');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const OUTPUT_DIR = path.join(__dirname, '..', 'generated', 'competition-seed');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(filename, content) {
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), `${content.endsWith('\n') ? content : `${content}\n`}`, 'utf8');
}

function writeJson(filename, data) {
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
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

function main() {
  const bundle = buildCompetitionSeedSqlBundle();
  ensureDir(OUTPUT_DIR);

  writeText(COMPETITION_SEED_ASSETS.files.bootstrapSql, bundle.sql);
  writeText(COMPETITION_SEED_ASSETS.files.bootstrapReadme, buildReadme(bundle));
  writeJson(COMPETITION_SEED_ASSETS.files.bootstrapSummary, {
    generatedAt: bundle.generatedAt,
    manifestVersion: bundle.manifestVersion,
    outputDir: OUTPUT_DIR,
    outputFiles: bundle.outputFiles,
    importOrder: bundle.importOrder,
    clearOrder: bundle.clearOrder,
    tableCounts: bundle.tableCounts,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        generatedAt: bundle.generatedAt,
        outputDir: OUTPUT_DIR,
        outputFiles: bundle.outputFiles,
        tableCounts: bundle.tableCounts,
      },
      null,
      2
    )}\n`
  );
}

main();
