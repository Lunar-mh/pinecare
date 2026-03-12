'use strict';

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 7, role: 'admin', isAdmin: true };
  next();
});

jest.mock('../../src/middleware/adminAuth', () => (req, _res, next) => {
  req.adminScope = { userId: 7, communityId: 1, isGlobalAdmin: true };
  next();
});

jest.mock('../../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock('../../src/controllers/adminOpsController', () => {
  const { ok } = require('../../src/utils/response');
  const createHandler = (payloadFactory = () => ({})) => async (req, res) => ok(res, payloadFactory(req), 'ok');

  return {
    healthOverview: createHandler(),
    medicationLogs: createHandler(),
    updateMedicationLogStatus: createHandler(),
    gpsCurrent: createHandler(),
    gpsTrail: createHandler(),
    familyBindings: createHandler(),
    medicalReports: createHandler(),
    sosEvents: createHandler(),
    updateSosEventStatus: createHandler(),
    fallEvents: createHandler(),
    drugInteractions: createHandler(),
    updateDrugInteractionStatus: createHandler(),
    timeBankServiceHistory: createHandler(),
    confirmTimeBankService: createHandler(),
    timeBankExchangeHistory: createHandler(),
    timeBankLeaderboard: createHandler(),
    integrationStatus: createHandler(() => ({ items: [{ key: 'medical', effectiveMode: 'stub' }] })),
    auditLogs: createHandler(),
    eventReplay: createHandler((req) => ({ userId: Number(req.query.userId || 0), summary: { totalTimelineItems: 5 } })),
    evidenceBundle: createHandler(() => ({ summary: { liveHealthyCount: 0 }, replay: null })),
    demoScenarios: createHandler(),
    demoBootstrap: createHandler(),
  };
});

const express = require('express');
const request = require('supertest');
const adminOpsRoutes = require('../../src/routes/adminOps');
const {
  summarizeSamples,
  recordPerformanceBaseline,
  printPerformanceBaseline,
} = require('./shared');

const CONCURRENCY = 80;
const P95_THRESHOLD_MS = Number(process.env.PERF_ADMIN_DIAGNOSTICS_P95_MS || 400);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminOpsRoutes);
  return app;
}

async function collectMetrics(app, routePath) {
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      const startedAt = Date.now();
      const res = await request(app).get(routePath);
      return { status: res.status, duration: Date.now() - startedAt };
    })
  );

  return {
    results,
    metrics: summarizeSamples(results.map((item) => item.duration)),
  };
}

describe('admin diagnostics performance', () => {
  it(`keeps key diagnostics endpoints under ${P95_THRESHOLD_MS}ms p95`, async () => {
    const app = createApp();

    const integrations = await collectMetrics(app, '/admin/system/integrations');
    const evidence = await collectMetrics(app, '/admin/system/evidence?userId=7');
    const replay = await collectMetrics(app, '/admin/system/event-replay?userId=7');

    printPerformanceBaseline(
      recordPerformanceBaseline('admin-integrations', integrations.metrics, {
        endpoint: 'GET /admin/system/integrations',
        concurrency: CONCURRENCY,
        sqlCount: 0,
        redisHits: 0,
        fallbackTriggered: false,
      })
    );
    printPerformanceBaseline(
      recordPerformanceBaseline('admin-evidence', evidence.metrics, {
        endpoint: 'GET /admin/system/evidence',
        concurrency: CONCURRENCY,
        sqlCount: 0,
        redisHits: 0,
        fallbackTriggered: false,
      })
    );
    printPerformanceBaseline(
      recordPerformanceBaseline('admin-event-replay', replay.metrics, {
        endpoint: 'GET /admin/system/event-replay',
        concurrency: CONCURRENCY,
        sqlCount: 0,
        redisHits: 0,
        fallbackTriggered: false,
      })
    );

    expect(integrations.results.every((item) => item.status === 200)).toBe(true);
    expect(evidence.results.every((item) => item.status === 200)).toBe(true);
    expect(replay.results.every((item) => item.status === 200)).toBe(true);
    expect(integrations.metrics.p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
    expect(evidence.metrics.p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
    expect(replay.metrics.p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});
