const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.resolve(PROJECT_ROOT, relativePath), 'utf8');
}

function countLines(relativePath) {
  return readProjectFile(relativePath).split(/\r?\n/).length;
}

function listJsFiles(dirPath) {
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listJsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('backend architecture guardrails', () => {
  test('keeps only canonical route mounts and removes retired legacy aliases', () => {
    const routesIndex = readProjectFile('src/routes/index.js');

    expect(routesIndex).toContain("safeUse('/time-bank', './timeBank')");
    expect(routesIndex).toContain("safeUse('/gps', './gpsTracking')");
    expect(routesIndex).toContain("safeUse('/ai-companion', './aiCompanion')");

    expect(routesIndex).not.toContain("safeUse('/timebank'");
    expect(routesIndex).not.toContain("safeUse('/location'");
    expect(routesIndex).not.toContain("safeUse('/companion'");

    expect(fs.existsSync(path.join(SRC_ROOT, 'routes', 'timeBankLegacy.js'))).toBe(false);
    expect(fs.existsSync(path.join(SRC_ROOT, 'routes', 'locationLegacy.js'))).toBe(false);
    expect(fs.existsSync(path.join(SRC_ROOT, 'routes', 'companionLegacy.js'))).toBe(false);
  });

  test('keeps middleware and routes off direct database or redis access', () => {
    const adminAuth = readProjectFile('src/middleware/adminAuth.js');
    const volunteerAuth = readProjectFile('src/middleware/volunteerAuth.js');
    const healthRoutes = readProjectFile('src/routes/healthRoutes.js');

    expect(adminAuth).not.toMatch(/config\/database|config\/db|config\/redis/);
    expect(volunteerAuth).not.toMatch(/config\/database|config\/db|config\/redis/);
    expect(healthRoutes).not.toMatch(/config\/database|config\/db|config\/redis/);

    expect(adminAuth).toContain("require('../models/adminScopeModel')");
    expect(volunteerAuth).toContain("require('../models/adminScopeModel')");
    expect(healthRoutes).toContain("require('../services/systemHealthService')");
  });

  test('keeps business services off direct database access and documents diagnostics exception', () => {
    const drugInteractionService = readProjectFile('src/services/drugInteractionService.js');
    const familyNotificationService = readProjectFile('src/services/familyNotificationService.js');
    const knowledgeGraphService = readProjectFile('src/services/knowledgeGraphService.js');
    const systemHealthService = readProjectFile('src/services/systemHealthService.js');
    const backendAgents = readProjectFile('AGENTS.md');

    expect(drugInteractionService).not.toMatch(/config\/database|config\/db|\bquery\(/);
    expect(familyNotificationService).not.toMatch(/config\/database|config\/db|\bquery\(/);
    expect(knowledgeGraphService).not.toMatch(/config\/database|config\/db|\bquery\(/);

    expect(systemHealthService).toContain("require('../config/database')");
    expect(backendAgents).toContain('systemHealthService is the documented diagnostics exception');
    expect(backendAgents).toContain('Signing, authentication, and receipt generation must fail closed');
  });

  test('avoids bare console.error outside the shared logger module', () => {
    const offenders = listJsFiles(SRC_ROOT)
      .filter((filePath) => !filePath.endsWith(path.join('src', 'utils', 'logger.js')))
      .filter((filePath) => readProjectFile(path.relative(PROJECT_ROOT, filePath)).includes('console.error('));

    expect(offenders).toEqual([]);
  });

  test('keeps facades thin and subservices under bounded size limits', () => {
    const lineGuardrails = [
      ['src/services/adminOpsService.js', 40],
      ['src/services/communityAdminService.js', 40],
      ['src/services/medicalApiService.js', 120],
      ['src/services/timeBankService.js', 60],
      ['src/services/familyService.js', 180],
      ['src/services/fallService.js', 280],
      ['src/services/adminOps/adminCareOverviewService.js', 650],
      ['src/services/adminOps/adminIncidentOpsService.js', 150],
      ['src/services/adminOps/adminDiagnosticsService.js', 300],
      ['src/services/communityAdmin/communityOrderService.js', 240],
      ['src/services/communityAdmin/communityActivityService.js', 120],
      ['src/services/communityAdmin/communityCareOpsService.js', 280],
      ['src/services/medicalApi/capability.js', 190],
      ['src/services/medicalApi/catalogService.js', 100],
      ['src/services/medicalApi/operationsService.js', 150],
      ['src/services/medicalApi/shared.js', 130],
      ['src/services/medicalApi/stubData.js', 120],
      ['src/services/timeBank/accountService.js', 70],
      ['src/services/timeBank/exchangeService.js', 90],
      ['src/services/timeBank/serviceRecordService.js', 210],
      ['src/services/timeBank/shared.js', 110],
      ['src/controllers/communityAdminController.js', 350],
      ['src/controllers/adminOpsController.js', 220],
    ];

    for (const [relativePath, maxLines] of lineGuardrails) {
      expect(countLines(relativePath)).toBeLessThanOrEqual(maxLines);
    }
  });
});
