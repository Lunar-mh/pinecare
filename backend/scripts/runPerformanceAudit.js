'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'generated', 'audits', 'performance');
const PERF_FILES = [
  'tests/performance/system.probes.perf.test.js',
  'tests/performance/adminDiagnostics.perf.test.js',
  'tests/performance/auth.perf.test.js',
  'tests/performance/communityAdmin.stats.perf.test.js',
  'tests/performance/fall.report.perf.test.js',
  'tests/performance/family.health.perf.test.js',
  'tests/performance/gps.perf.test.js',
  'tests/performance/health.perf.test.js',
  'tests/performance/reminder.perf.test.js',
  'tests/performance/sos.trigger.latency.test.js',
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadBaseline(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function buildMarkdown(records) {
  const lines = [
    '# Performance Audit Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '| Name | p50 | p95 | p99 | max | Metadata |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
  ];

  records.forEach((record) => {
    const metadata = Object.entries(record.metadata || {})
      .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('; ');
    lines.push(
      `| ${record.name} | ${record.metrics.p50}ms | ${record.metrics.p95}ms | ${record.metrics.p99}ms | ${record.metrics.max}ms | ${metadata} |`
    );
  });

  const sorted = [...records].sort((left, right) => (right.metrics.p95 || 0) - (left.metrics.p95 || 0));
  lines.push('', '## Hotspots', '');
  sorted.slice(0, 5).forEach((record, index) => {
    lines.push(`${index + 1}. ${record.name} (p95=${record.metrics.p95}ms, max=${record.metrics.max}ms)`);
  });

  lines.push('', '## Notes', '');
  lines.push('- Baseline is captured in non-live mode with mocked or rehearsal-safe dependencies.');
  lines.push('- Use this report for comparison before and after live-provider cutover.');

  return `${lines.join('\n')}\n`;
}

function run() {
  ensureDir(OUTPUT_DIR);
  const baselineFile = path.join(OUTPUT_DIR, 'latest.json');
  if (fs.existsSync(baselineFile)) {
    fs.unlinkSync(baselineFile);
  }

  const jestBin = require.resolve('jest/bin/jest');
  const result = spawnSync(process.execPath, [jestBin, '--runInBand', '--coverage=false', ...PERF_FILES], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      PERF_BASELINE_FILE: baselineFile,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  const records = loadBaseline(baselineFile);
  const markdown = buildMarkdown(records);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'latest.md'), markdown);
  process.stdout.write(`${markdown}\n`);
}

run();
