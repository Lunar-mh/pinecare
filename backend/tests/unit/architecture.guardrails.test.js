const fs = require('fs');
const path = require('path');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '../../', relativePath), 'utf8');
}

function countLines(relativePath) {
  return readProjectFile(relativePath).split(/\r?\n/).length;
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

    expect(fs.existsSync(path.resolve(__dirname, '../../src/routes/timeBankLegacy.js'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '../../src/routes/locationLegacy.js'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '../../src/routes/companionLegacy.js'))).toBe(false);
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

