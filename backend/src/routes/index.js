'use strict';

const express = require('express');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/', (_req, res) => {
  return ok(res, null, 'Server is running.');
});

function safeUse(path, routeFile) {
  try {
    require.resolve(routeFile, { paths: [__dirname] });
    const routeModule = require(routeFile);
    router.use(path, routeModule);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && String(err.message || '').includes(routeFile)) {
      console.warn(`[safeUse] skipped ${path}, missing route module: ${routeFile}`);
      return;
    }
    throw err;
  }
}

safeUse('/auth', './auth');
safeUse('/user', './user');

safeUse('/admin/users', './adminUsers');
safeUse('/admin', './adminOps');

safeUse('/health-archive', './healthArchive');
safeUse('/device', './deviceCompat');
safeUse('/medication', './medication');
safeUse('/sos', './sos');
safeUse('/family', './family');
safeUse('/voice', './voice');
safeUse('/fall-detection', './fallDetection');
safeUse('/ai-consult', './aiConsult');
safeUse('/drug-interaction', './drugInteraction');
safeUse('/time-bank', './timeBank');
safeUse('/ai-companion', './aiCompanion');
safeUse('/family-space', './familySpace');
safeUse('/community', './community');
safeUse('/volunteer', './volunteer');
safeUse('/gps', './gpsTracking');
safeUse('/medical', './medicalIntegration');
safeUse('/statistics', './statistics');

module.exports = router;
