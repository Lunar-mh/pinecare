const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
function buildModule(requireLine, chunks) {
  return [
    "'use strict';",
    '',
    requireLine,
    '',
    'module.exports = {',
    ...chunks.flatMap((chunk) => [...chunk, '']),
    '};',
    '',
  ].join('\n');
}
const source = read(path.join(process.cwd(), 'tmp-timebank-head.js'));
const lines = source.split(/\r?\n/);
const classStart = lines.findIndex((line) => line.includes('class TimeBankModel {'));
const exportIndex = lines.findIndex((line) => line.includes('module.exports = TimeBankModel'));
const body = lines.slice(classStart + 1, exportIndex - 1);
const starts = [];
for (let i = 0; i < body.length; i += 1) {
  if (/^  static async \w+\(/.test(body[i])) starts.push(i);
}
const chunks = new Map();
for (let i = 0; i < starts.length; i += 1) {
  const start = starts[i];
  const end = i + 1 < starts.length ? starts[i + 1] : body.length;
  const slice = body.slice(start, end).map((line) => line.replace(/^  static async/, '  async'));
  const name = slice[0].match(/^  async (\w+)\(/)[1];
  chunks.set(name, slice);
}
const select = (names) => names.map((name) => chunks.get(name)).filter(Boolean);
const root = process.cwd();
write(path.join(root, 'backend', 'src', 'models', 'timeBank', 'account.js'), buildModule("const { pool, query, getCreditLevelByScore } = require('./shared');", select(['getOrCreateAccountByUserId', 'updateAccountBalance'])));
write(path.join(root, 'backend', 'src', 'models', 'timeBank', 'serviceRecord.js'), buildModule("const { pool, query, generateRecordHash, ZERO_HASH, getCreditLevelByScore } = require('./shared');", select(['getLatestRecordHash','createServiceRecord','getServiceRecordById','updateServiceRecordStatus','settleServiceRecord','listServiceHistory'])));
write(path.join(root, 'backend', 'src', 'models', 'timeBank', 'exchange.js'), buildModule("const { pool, query } = require('./shared');", select(['listExchangeHistory','listExchangeHistoryByUser','createExchangeRecord'])));
write(path.join(root, 'backend', 'src', 'models', 'timeBank', 'leaderboard.js'), buildModule("const { query } = require('./shared');", select(['getCommunityLeaderboard'])));
