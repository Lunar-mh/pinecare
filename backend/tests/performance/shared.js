'use strict';

const fs = require('fs');
const path = require('path');

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)];
}

function summarizeSamples(values) {
  const numericValues = Array.isArray(values)
    ? values.filter((value) => Number.isFinite(value)).map((value) => Number(value))
    : [];

  return {
    count: numericValues.length,
    p50: percentile(numericValues, 50),
    p95: percentile(numericValues, 95),
    p99: percentile(numericValues, 99),
    max: numericValues.length ? Math.max(...numericValues) : 0,
  };
}

function appendBaselineRecord(record) {
  const baselineFile = String(process.env.PERF_BASELINE_FILE || '').trim();
  if (!baselineFile) {
    return;
  }

  const targetFile = path.resolve(baselineFile);
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });

  let current = [];
  if (fs.existsSync(targetFile)) {
    try {
      current = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      if (!Array.isArray(current)) {
        current = [];
      }
    } catch (_err) {
      current = [];
    }
  }

  const next = current.filter((item) => item.name !== record.name);
  next.push(record);
  fs.writeFileSync(targetFile, JSON.stringify(next, null, 2));
}

function recordPerformanceBaseline(name, metrics, metadata = {}) {
  const record = {
    name,
    recordedAt: new Date().toISOString(),
    metrics,
    metadata,
  };
  appendBaselineRecord(record);
  return record;
}

function printPerformanceBaseline(record) {
  const { name, metrics, metadata } = record;
  console.log(`\n[perf] ${name}`);
  console.log(`  samples : ${metrics.count}`);
  console.log(`  p50     : ${metrics.p50}ms`);
  console.log(`  p95     : ${metrics.p95}ms`);
  console.log(`  p99     : ${metrics.p99}ms`);
  console.log(`  max     : ${metrics.max}ms`);

  Object.entries(metadata || {}).forEach(([key, value]) => {
    const normalized = typeof value === 'object' ? JSON.stringify(value) : value;
    console.log(`  ${key} : ${normalized}`);
  });
}

module.exports = {
  percentile,
  summarizeSamples,
  recordPerformanceBaseline,
  printPerformanceBaseline,
};
