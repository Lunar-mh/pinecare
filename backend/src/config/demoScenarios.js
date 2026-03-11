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
    id: 'family-space-care',
    title: 'Family Space care interaction',
    summary: 'Voice message, album upload, points accumulation, and leaderboard refresh.',
    modules: ['family-space', 'voice', 'oss'],
    bootstrap: {
      families: 1,
      members: 2,
      voiceMessages: 1,
      albumPhotos: 2,
    },
    apiSequence: [
      'POST /family-space/message/send',
      'GET /family-space/message/list',
      'POST /family-space/album/upload',
      'GET /family-space/leaderboard',
    ],
    checklist: [
      'Prepare one approved family binding.',
      'Ensure OSS mode and upload token state are visible in diagnostics.',
      'Validate points growth after album upload.',
    ],
  },
  {
    id: 'medical-consultation',
    title: 'Medical directory, consult, and appointment flow',
    summary: 'Hospital lookup, online consult session, appointment creation, and report sync.',
    modules: ['medical'],
    bootstrap: {
      hospitals: 2,
      doctors: 3,
      consultations: 1,
      appointments: 1,
      reports: 2,
    },
    apiSequence: [
      'GET /medical/hospitals',
      'GET /medical/doctors',
      'POST /medical/consult/start',
      'POST /medical/appointment',
      'GET /medical/reports',
    ],
    checklist: [
      'Verify upstream medical service mode before demo.',
      'Confirm idempotency key replay for appointment creation.',
      'Prepare timeout and fallback explanation.',
    ],
  },
  {
    id: 'community-admin-ops',
    title: 'Community admin operations dashboard',
    summary: 'Volunteer, work order, activity, and statistics dashboard walkthrough.',
    modules: ['community', 'statistics'],
    bootstrap: {
      volunteers: 3,
      workOrders: 3,
      activities: 2,
    },
    apiSequence: [
      'GET /community/volunteers',
      'POST /community/orders',
      'PATCH /community/orders/:orderId/assign',
      'POST /community/activities',
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
    id: 'competition-full-loop',
    title: 'Competition full replay',
    summary: 'Replay the five main competition chains across elder, family, community, volunteer, and medical capabilities.',
    modules: ['auth', 'medication', 'sos', 'family-space', 'community', 'volunteer', 'medical'],
    bootstrap: {
      users: 4,
      medicationPlans: 1,
      sosEvents: 1,
      families: 1,
      workOrders: 1,
      consultations: 1,
    },
    apiSequence: [
      'POST /auth/login/phone',
      'GET /health-archive/today',
      'POST /medication/confirm',
      'POST /sos/trigger',
      'GET /family/overview',
      'POST /community/orders',
      'PATCH /community/orders/:orderId/assign',
      'POST /volunteer/tasks/:taskId/complete',
      'POST /medical/consult/start',
      'GET /admin/system/integrations',
    ],
    checklist: [
      'Prepare elder, family, community admin and volunteer identities.',
      'Keep medical mode explanation ready for both stub and live.',
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
  {
    id: 'time-bank-loop',
    title: 'Time Bank earning and exchange loop',
    summary: 'Service confirmation, account growth, exchange history, and leaderboard sync.',
    modules: ['time-bank'],
    bootstrap: {
      serviceRecords: 2,
      exchangeRecords: 1,
    },
    apiSequence: [
      'GET /time-bank/account',
      'POST /time-bank/services',
      'POST /time-bank/services/:id/accept',
      'GET /time-bank/leaderboard',
    ],
    checklist: [
      'Prepare one pending service record and one exchange record.',
      'Verify admin leaderboard matches user-side account state.',
      'Keep a replay log for the confirmation path.',
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
