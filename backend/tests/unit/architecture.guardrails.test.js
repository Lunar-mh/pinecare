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

  test('prevents the heaviest services and controllers from growing past guardrail size', () => {
    const lineGuardrails = [
      ['src/services/adminOpsService.js', 1200],
      ['src/services/communityAdminService.js', 750],
      ['src/services/medicalApiService.js', 550],
      ['src/services/fallService.js', 475],
      ['src/services/familyService.js', 450],
      ['src/services/timeBankService.js', 475],
      ['src/controllers/communityAdminController.js', 350],
      ['src/controllers/adminOpsController.js', 220],
    ];

    for (const [relativePath, maxLines] of lineGuardrails) {
      expect(countLines(relativePath)).toBeLessThanOrEqual(maxLines);
    }
  });
});
