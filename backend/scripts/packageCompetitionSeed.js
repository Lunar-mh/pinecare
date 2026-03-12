'use strict';

const fs = require('fs');
const path = require('path');
const { generateCompetitionSeedJsonArtifacts } = require('./exportCompetitionSeed');
const { generateCompetitionSeedSqlArtifacts } = require('./exportCompetitionSeedSql');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const ROOT_DIR = path.join(__dirname, '..');
const DEFAULT_OUTPUT_DIR = path.join(ROOT_DIR, 'generated', 'competition-package');
const DEFAULT_PACKAGE_NAME = 'competition-seed-bundle';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(file, content) {
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  fs.writeFileSync(file, normalized, 'utf8');
}

function buildPackageReadme(packageDir) {
  const lines = [
    '# Competition Seed Package',
    '',
    `Generated at: ${new Date().toISOString()}`,
    `Package dir: ${packageDir}`,
    '',
    '## Included',
    '',
    '- `json/`: replay and defense reference data',
    '- `sql/`: bootstrap SQL and import summary',
    '',
    '## Commands',
    '',
    ...COMPETITION_SEED_ASSETS.commands.map((command) => `- \`${command}\``),
    '',
    '- Run `npm run seed:competition:package` whenever you need a fresh offline package.',
    '',
  ];
  return lines.join('\n');
}

function packageCompetitionSeed(options = {}) {
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : DEFAULT_OUTPUT_DIR;
  const packageName = String(options.packageName || DEFAULT_PACKAGE_NAME).trim() || DEFAULT_PACKAGE_NAME;
  const packageDir = path.join(outputDir, packageName);
  const jsonDir = path.join(packageDir, 'json');
  const sqlDir = path.join(packageDir, 'sql');

  ensureDir(jsonDir);
  ensureDir(sqlDir);

  const jsonSummary = generateCompetitionSeedJsonArtifacts({ outputDir: jsonDir });
  const sqlSummary = generateCompetitionSeedSqlArtifacts({ outputDir: sqlDir });
  const manifest = {
    generatedAt: new Date().toISOString(),
    packageDir,
    jsonDir,
    sqlDir,
    commands: COMPETITION_SEED_ASSETS.commands,
    jsonSummary,
    sqlSummary,
  };

  writeText(path.join(packageDir, 'README.md'), buildPackageReadme(packageDir));
  fs.writeFileSync(path.join(packageDir, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return manifest;
}

function main() {
  const result = packageCompetitionSeed();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildPackageReadme,
  packageCompetitionSeed,
};
