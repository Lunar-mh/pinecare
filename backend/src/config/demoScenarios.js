'use strict';

const DEMO_SCENARIOS = [
  {
    id: 'auth-medication-sos',
    title: 'Authentication + Medication + SOS closed loop',
    summary: 'User login, medication reminder confirmation, and SOS escalation flow.',
    modules: ['auth', 'medication', 'sos'],
    bootstrap: {
      users: 2,
      medicationPlans: 1,
      emergencyContacts: 2,
      sosEvents: 1,
    },
    apiSequence: [
      'POST /auth/login/phone',
      'GET /medication/plans',
      'POST /medication/confirm',
      'POST /sos/trigger',
      'POST /sos/cancel',
    ],
    checklist: [
      'Seed one elder account and one family account.',
      'Prepare a pending medication log and two emergency contacts.',
      'Verify SOS fallback paths for SMS and WeChat.',
    ],
  },
  {
    id: 'community-admin-ops',
    title: 'Community admin operations dashboard',
    summary: 'Volunteer dispatch, work order lifecycle, and dashboard aggregation walkthrough.',
    modules: ['community'],
    bootstrap: {
      volunteers: 3,
      workOrders: 3,
    },
    apiSequence: [
      'GET /community/volunteers',
      'POST /community/orders',
      'PATCH /community/orders/:orderId/assign',
      'GET /community/stats',
    ],
    checklist: [
      'Seed one community admin scope.',
      'Prepare one pending and one completed work order.',
      'Verify assignment and dashboard status synchronization.',
      'Show dashboard aggregation and filtering.',
    ],
  },
  {
    id: 'volunteer-task-execution',
    title: 'Volunteer task execution loop',
    summary: 'Community dispatch, volunteer accept, check-in, completion, and audit trail replay.',
    modules: ['community', 'volunteer'],
    bootstrap: {
      volunteers: 1,
      workOrders: 1,
      attendanceLogs: 1,
      auditLogs: 4,
    },
    apiSequence: [
      'POST /community/orders',
      'PATCH /community/orders/:orderId/assign',
      'GET /volunteer/tasks',
      'POST /volunteer/tasks/:taskId/check-in',
      'POST /volunteer/tasks/:taskId/complete',
      'GET /admin/system/audit-logs',
    ],
    checklist: [
      'Prepare one community admin and one volunteer under the same community.',
      'Ensure volunteer can only see own or available tasks.',
      'Verify order status, attendance and audit logs update after completion.',
    ],
  },
  {
    id: 'pinecare-full-loop',
    title: 'PineCare four-mainline full replay',
    summary:
      'Replay the four core PineCare domains across elder, family, community admin, and volunteer endpoints.',
    modules: ['auth', 'health', 'medication', 'sos', 'family', 'community', 'volunteer'],
    bootstrap: {
      users: 4,
      medicationPlans: 1,
      sosEvents: 1,
      families: 1,
      workOrders: 1,
    },
    apiSequence: [
      'POST /auth/login/phone',
      'GET /health-archive/today',
      'POST /medication/confirm',
      'POST /sos/trigger',
      'GET /family/elderly-overview',
      'POST /community/orders',
      'PATCH /community/orders/:orderId/assign',
      'POST /volunteer/tasks/:taskId/complete',
      'GET /admin/system/integrations',
    ],
    checklist: [
      'Prepare elder, family, community admin and volunteer identities.',
      'Verify SMS and WeChat notification modes before live rehearsal.',
      'Use audit logs and integration diagnostics as proof material during defense.',
    ],
  },
  {
    id: 'gps-fence-fall',
    title: 'GPS fence and fall-detection safety flow',
    summary: 'Location upload, fence event, and fall-detection response chain.',
    modules: ['gps', 'fall-detection'],
    bootstrap: {
      devices: 1,
      fences: 1,
      locationRecords: 3,
      fallEvents: 1,
    },
    apiSequence: [
      'POST /gps/upload',
      'POST /gps/fences',
      'GET /gps/trail',
      'POST /fall-detection/report',
    ],
    checklist: [
      'Prepare one active fence and one location trail.',
      'Demonstrate enter/exit evaluation and fall notification status.',
      'Verify dashboard can read current GPS state.',
    ],
  },
];

function getDemoScenarioById(scenarioId) {
  return DEMO_SCENARIOS.find((item) => item.id === scenarioId) || null;
}

module.exports = {
  DEMO_SCENARIOS,
  getDemoScenarioById,
};
