const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function extractObjectMethods(source, objectName) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes(`const ${objectName} = {`));
  const end = lines.findIndex((line, index) => index > start && line.trim() === '};');
  const body = lines.slice(start + 1, end);
  const chunks = [];
  let current = null;

  for (const line of body) {
    const match = line.match(/^  async (\w+)\(/);
    if (match) {
      if (current) chunks.push(current);
      current = { name: match[1], lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) chunks.push(current);
  return chunks;
}

function extractClassMethods(source, className) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes(`class ${className} {`));
  const end = lines.findIndex((line, index) => index > start && line.trim() === '}');
  const body = lines.slice(start + 1, end);
  const chunks = [];
  let current = null;

  for (const line of body) {
    const match = line.match(/^  static async (\w+)\(/);
    if (match) {
      if (current) chunks.push(current);
      current = { name: match[1], lines: [line.replace('  static async', '  async')] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) chunks.push(current);
  return chunks;
}

function buildModule(requireLine, chunks) {
  return [
    "'use strict';",
    '',
    requireLine,
    '',
    'module.exports = {',
    ...chunks.flatMap((chunk) => [...chunk.lines, '']),
    '};',
    '',
  ].join('\n');
}

function select(chunks, names) {
  const wanted = new Set(names);
  return chunks.filter((chunk) => wanted.has(chunk.name));
}

const root = process.cwd();

const adminSource = read(path.join(root, 'backend', 'src', 'models', 'adminOpsModel.js'));
const adminChunks = extractObjectMethods(adminSource, 'adminOpsModel');
write(
  path.join(root, 'backend', 'src', 'models', 'adminOps', 'healthMedication.js'),
  buildModule(
    "const { query, buildWhereSql, resolveFamilyBindingColumns } = require('./common');",
    select(adminChunks, [
      'listHealthOverview',
      'countHealthOverview',
      'listMedicationLogs',
      'countMedicationLogs',
      'updateMedicationLogStatus',
      'getMedicationLogById',
      'listGpsCurrent',
      'countGpsCurrent',
      'listGpsTrail',
      'listFamilyBindings',
      'countFamilyBindings',
    ])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'adminOps', 'medicalSos.js'),
  buildModule(
    "const { query, buildWhereSql } = require('./common');",
    select(adminChunks, [
      'listMedicalReports',
      'countMedicalReports',
      'listSosEvents',
      'countSosEvents',
      'getSosEventById',
      'updateSosEventStatus',
      'summarizeSosNotifications',
      'listSosNotificationDetails',
      'listFallEvents',
      'countFallEvents',
      'listDrugInteractions',
      'updateDrugInteractionStatus',
      'getDrugInteractionById',
    ])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'adminOps', 'timeBank.js'),
  buildModule(
    "const { query, buildWhereSql } = require('./common');",
    select(adminChunks, [
      'listTimeBankServiceHistory',
      'countTimeBankServiceHistory',
      'getTimeBankServiceRecordById',
      'listTimeBankExchangeHistory',
      'listTimeBankLeaderboard',
    ])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'adminOpsModel.js'),
  [
    "'use strict';",
    '',
    'module.exports = {',
    "  ...require('./adminOps/healthMedication'),",
    "  ...require('./adminOps/medicalSos'),",
    "  ...require('./adminOps/timeBank'),",
    '};',
    '',
  ].join('\n')
);

const timeBankSource = read(path.join(root, 'backend', 'src', 'models', 'timeBank.js'));
const timeBankChunks = extractClassMethods(timeBankSource, 'TimeBankModel');
write(
  path.join(root, 'backend', 'src', 'models', 'timeBank', 'shared.js'),
  [
    "'use strict';",
    '',
    "const { pool, query } = require('../../config/database');",
    "const { generateRecordHash } = require('../../utils/hashChain');",
    '',
    "const ZERO_HASH = '0'.repeat(64);",
    '',
    'function getCreditLevelByScore(creditScore) {',
    '  const score = Math.max(0, Math.min(100, Number(creditScore) || 0));',
    '',
    "  if (score >= 95) return 'angel';",
    "  if (score >= 80) return 'gold';",
    "  if (score >= 60) return 'silver';",
    "  return 'new';",
    '}',
    '',
    'module.exports = {',
    '  pool,',
    '  query,',
    '  generateRecordHash,',
    '  ZERO_HASH,',
    '  getCreditLevelByScore,',
    '};',
    '',
  ].join('\n')
);
write(
  path.join(root, 'backend', 'src', 'models', 'timeBank', 'account.js'),
  buildModule(
    "const { pool, query, getCreditLevelByScore } = require('./shared');",
    select(timeBankChunks, ['getOrCreateAccountByUserId', 'updateAccountBalance'])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'timeBank', 'serviceRecord.js'),
  buildModule(
    "const { pool, query, generateRecordHash, ZERO_HASH, getCreditLevelByScore } = require('./shared');",
    select(timeBankChunks, [
      'getLatestRecordHash',
      'createServiceRecord',
      'getServiceRecordById',
      'updateServiceRecordStatus',
      'settleServiceRecord',
      'listServiceHistory',
    ])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'timeBank', 'exchange.js'),
  buildModule(
    "const { pool, query } = require('./shared');",
    select(timeBankChunks, ['listExchangeHistory', 'listExchangeHistoryByUser', 'createExchangeRecord'])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'timeBank', 'leaderboard.js'),
  buildModule(
    "const { query } = require('./shared');",
    select(timeBankChunks, ['getCommunityLeaderboard'])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'timeBank.js'),
  [
    "'use strict';",
    '',
    'module.exports = {',
    "  ...require('./timeBank/account'),",
    "  ...require('./timeBank/serviceRecord'),",
    "  ...require('./timeBank/exchange'),",
    "  ...require('./timeBank/leaderboard'),",
    '};',
    '',
  ].join('\n')
);

const communitySource = read(path.join(root, 'backend', 'src', 'models', 'communityAdmin.js'));
const communityChunks = extractObjectMethods(communitySource, 'communityAdminModel');
write(
  path.join(root, 'backend', 'src', 'models', 'communityAdmin', 'shared.js'),
  [
    "'use strict';",
    '',
    "const { query } = require('../../config/database');",
    '',
    "const ORDER_STATUS_LIST = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];",
    '',
    'function generateOrderNo() {',
    '  const now = new Date();',
    '  const y = now.getFullYear();',
    "  const m = String(now.getMonth() + 1).padStart(2, '0');",
    "  const d = String(now.getDate()).padStart(2, '0');",
    "  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');",
    '  return `ORDER-${y}${m}${d}-${random}`;',
    '}',
    '',
    'function buildOrderWhere(communityId, filters = {}) {',
    "  const where = ['so.community_id = ?'];",
    '  const params = [communityId];',
    '',
    '  if (filters.status) { where.push(\'so.status = ?\'); params.push(filters.status); }',
    '  if (filters.serviceType) { where.push(\'so.service_type = ?\'); params.push(filters.serviceType); }',
    '  if (filters.elderId) { where.push(\'so.elder_id = ?\'); params.push(filters.elderId); }',
    '  if (filters.volunteerId) { where.push(\'so.volunteer_id = ?\'); params.push(filters.volunteerId); }',
    '  if (filters.startDate) { where.push(\'so.created_at >= ?\'); params.push(filters.startDate); }',
    '  if (filters.endDate) { where.push(\'so.created_at <= ?\'); params.push(filters.endDate); }',
    '',
    '  return { whereSql: where.join(\' AND \' ), params };',
    '}',
    '',
    'module.exports = {',
    '  query,',
    '  ORDER_STATUS_LIST,',
    '  generateOrderNo,',
    '  buildOrderWhere,',
    '};',
    '',
  ].join('\n')
);
write(
  path.join(root, 'backend', 'src', 'models', 'communityAdmin', 'volunteers.js'),
  buildModule(
    "const { query } = require('./shared');",
    select(communityChunks, ['listVolunteers', 'countVolunteers', 'findVolunteerInCommunity'])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'communityAdmin', 'orders.js'),
  [
    "'use strict';",
    '',
    "const { query, ORDER_STATUS_LIST, generateOrderNo, buildOrderWhere } = require('./shared');",
    '',
    'module.exports = {',
    '  ORDER_STATUS_LIST,',
    '  generateOrderNo,',
    ...select(communityChunks, ['listOrders', 'countOrders', 'findOrderById', 'createOrder', 'assignOrder', 'updateOrderStatus']).flatMap((chunk) => [...chunk.lines, '']),
    '};',
    '',
  ].join('\n')
);
write(
  path.join(root, 'backend', 'src', 'models', 'communityAdmin', 'activities.js'),
  buildModule(
    "const { query } = require('./shared');",
    select(communityChunks, ['listActivities', 'countActivities', 'createActivity'])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'communityAdmin', 'stats.js'),
  buildModule(
    "const { query } = require('./shared');",
    select(communityChunks, ['getStatsData'])
  )
);
write(
  path.join(root, 'backend', 'src', 'models', 'communityAdmin.js'),
  [
    "'use strict';",
    '',
    'module.exports = {',
    "  ...require('./communityAdmin/volunteers'),",
    "  ...require('./communityAdmin/orders'),",
    "  ...require('./communityAdmin/activities'),",
    "  ...require('./communityAdmin/stats'),",
    '};',
    '',
  ].join('\n')
);
