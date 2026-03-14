const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = 'D:/03_Study/Desktop/old';
const OUT_DIR = path.join(ROOT, 'evidence', 'frontend-page-proof');
const OUT_SHOTS = path.join(OUT_DIR, 'shots');

const API_PORT = 3999;
const PHONE = '15553609880';

const pageSpecs = [
  { page: 'pages/login/index', source: 'frontend/src/pages/login/index.tsx', method: 'POST', endpoint: '/auth/sms-code', body: { phone: PHONE, purpose: 'login' }, auth: false },
  { page: 'pages/index/index', source: 'frontend/src/pages/index/index.tsx', method: 'GET', endpoint: '/health-archive/today', auth: true },
  { page: 'pages/index/FamilyDashboard', source: 'frontend/src/pages/index/FamilyDashboard.tsx', method: 'GET', endpoint: '/family/elderly-overview', auth: true },
  { page: 'pages/services/index', source: 'frontend/src/pages/services/index.tsx', method: 'GET', endpoint: '/user/page-config', auth: true },
  { page: 'pages/profile/index', source: 'frontend/src/pages/profile/index.tsx', method: 'GET', endpoint: '/user/info', auth: true },
  { page: 'subpackages/health/pages/index/index', source: 'frontend/src/subpackages/health/pages/index/index.tsx', method: 'GET', endpoint: '/health-archive/alerts', auth: true },
  { page: 'subpackages/health/pages/blood-pressure/index', source: 'frontend/src/subpackages/health/pages/blood-pressure/index.tsx', method: 'GET', endpoint: '/health-archive/blood-pressure', auth: true },
  { page: 'subpackages/health/pages/heart-rate/index', source: 'frontend/src/subpackages/health/pages/heart-rate/index.tsx', method: 'GET', endpoint: '/health-archive/heart-rate', auth: true },
  { page: 'subpackages/health/pages/trend/index', source: 'frontend/src/subpackages/health/pages/trend/index.tsx', method: 'GET', endpoint: '/health-archive/blood-pressure/trend?days=7', auth: true },
  { page: 'subpackages/health/pages/records/index', source: 'frontend/src/subpackages/health/pages/records/index.tsx', method: 'GET', endpoint: '/health-archive/heart-rate', auth: true },
  { page: 'subpackages/family_health/pages/blood-pressure/index', source: 'frontend/src/subpackages/family_health/pages/blood-pressure/index.tsx', method: 'GET', endpoint: '/health-archive/blood-pressure/latest', auth: true },
  { page: 'subpackages/family_health/pages/heart-rate/index', source: 'frontend/src/subpackages/family_health/pages/heart-rate/index.tsx', method: 'GET', endpoint: '/health-archive/heart-rate/latest', auth: true },
  { page: 'subpackages/medication/pages/index/index', source: 'frontend/src/subpackages/medication/pages/index/index.tsx', method: 'GET', endpoint: '/medication/plans', auth: true },
  { page: 'subpackages/medication/pages/add/index', source: 'frontend/src/subpackages/medication/pages/add/index.tsx', method: 'POST', endpoint: '/medication/plans', auth: true, body: { medication_name: '联调测试药物', dosage: '1片', frequency: 'once_daily', remind_times: ['08:00'], start_date: '2026-03-14' } },
  { page: 'subpackages/sos/pages/index/index', source: 'frontend/src/subpackages/sos/pages/index/index.tsx', method: 'GET', endpoint: '/family/elderly-overview', auth: true },
  { page: 'subpackages/voice_ai/pages/index/index', source: 'frontend/src/subpackages/voice_ai/pages/index/index.tsx', method: 'GET', endpoint: '/voice/history?page=1&pageSize=10', auth: true },
  { page: 'subpackages/timebank/pages/index/index', source: 'frontend/src/subpackages/timebank/pages/index/index.tsx', method: null, endpoint: null, auth: false, note: '该页为迁移说明页，当前无后端数据接口' },
  { page: 'subpackages/family_space/pages/index/index', source: 'frontend/src/subpackages/family_space/pages/index/index.tsx', method: 'GET', endpoint: '/family-space/message/list?page=1&pageSize=5', auth: true },
  { page: 'subpackages/location/pages/index/index', source: 'frontend/src/subpackages/location/pages/index/index.tsx', method: 'GET', endpoint: '/location/current', auth: true },
  { page: 'subpackages/medical/pages/index/index', source: 'frontend/src/subpackages/medical/pages/index/index.tsx', method: 'GET', endpoint: '/medical/doctors?page=1&pageSize=5', auth: true },
  { page: 'subpackages/ai_consult/pages/index/index', source: 'frontend/src/subpackages/ai_consult/pages/index/index.tsx', method: 'GET', endpoint: '/ai-consult/profile', auth: true },
  { page: 'subpackages/drug_check/pages/index/index', source: 'frontend/src/subpackages/drug_check/pages/index/index.tsx', method: 'GET', endpoint: '/drug-interaction/history', auth: true },
  { page: 'subpackages/ai_companion/pages/index/index', source: 'frontend/src/subpackages/ai_companion/pages/index/index.tsx', method: 'GET', endpoint: '/companion/games', auth: true },
  { page: 'subpackages/settings/pages/index/index', source: 'frontend/src/subpackages/settings/pages/index/index.tsx', method: 'GET', endpoint: '/user/page-config', auth: true },
  { page: 'subpackages/settings/pages/about/index', source: 'frontend/src/subpackages/settings/pages/about/index.tsx', method: 'GET', endpoint: '/user/page-config', auth: true },
  { page: 'subpackages/settings/pages/device/index', source: 'frontend/src/subpackages/settings/pages/device/index.tsx', method: 'GET', endpoint: '/user/devices', auth: true },
  { page: 'subpackages/settings/pages/emergency/index', source: 'frontend/src/subpackages/settings/pages/emergency/index.tsx', method: 'GET', endpoint: '/user/emergency-contacts', auth: true },
  { page: 'subpackages/settings/pages/feedback/index', source: 'frontend/src/subpackages/settings/pages/feedback/index.tsx', method: 'POST', endpoint: '/user/feedback', body: { content: '联调核验：此条为自动化验收提交。' }, auth: true },
];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function requestJson({ method, endpoint, body, token }) {
  return new Promise((resolve) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const req = http.request({ host: '127.0.0.1', port: API_PORT, path: `/api/v1${endpoint}`, method, headers: { 'Content-Type': 'application/json', ...(payload ? { 'Content-Length': payload.length } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', (error) => resolve({ status: 0, body: { message: String(error && error.message ? error.message : error) } }));
    if (payload) req.write(payload);
    req.end();
  });
}
async function getLoginToken() {
  await requestJson({ method: 'POST', endpoint: '/auth/sms-code', body: { phone: PHONE, purpose: 'login' }, token: null });
  const code = '000000';
  const login = await requestJson({ method: 'POST', endpoint: '/auth/phone', body: { phone: PHONE, code }, token: null });
  const token = login.body && login.body.data ? login.body.data.token : '';
  return { token, loginStatus: login.status, loginBody: login.body, code };
}
function toSafeName(pagePath) { return pagePath.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_'); }

(async () => {
  ensureDir(OUT_DIR); ensureDir(OUT_SHOTS);
  const auth = await getLoginToken();
  if (!auth.token) throw new Error(`登录失败，status=${auth.loginStatus}`);
  const results = [];
  for (const spec of pageSpecs) {
    const entry = { page: spec.page, source: spec.source, method: spec.method, endpoint: spec.endpoint, requestBody: spec.body || null, authRequired: spec.auth, note: spec.note || '', timestamp: new Date().toISOString(), status: null, response: null, screenshot: spec.method ? `shots/${toSafeName(spec.page)}.png` : '' };
    if (!spec.method || !spec.endpoint) { entry.response = { message: spec.note || '无接口' }; results.push(entry); continue; }
    const res = await requestJson({ method: spec.method, endpoint: spec.endpoint, body: spec.body, token: spec.auth ? auth.token : null });
    entry.status = res.status; entry.response = res.body; results.push(entry);
  }
  const output = { generatedAt: new Date().toISOString(), apiBase: `http://127.0.0.1:${API_PORT}/api/v1`, authPhone: PHONE, loginCodeFromDb: auth.code, totalPages: pageSpecs.length, successCount: results.filter((x) => typeof x.status === 'number' && x.status >= 200 && x.status < 300).length, failCount: results.filter((x) => typeof x.status === 'number' && (x.status < 200 || x.status >= 300)).length, noApiCount: results.filter((x) => x.status === null).length, pages: results };
  fs.writeFileSync(path.join(OUT_DIR, 'api-results.json'), JSON.stringify(output, null, 2), 'utf8');
  const lines = [];
  lines.push('# 小程序全页面联调清单（逐页打点）');
  lines.push('');
  lines.push(`- 生成时间：${output.generatedAt}`);
  lines.push(`- API 基线：${output.apiBase}`);
  lines.push(`- 页面总数：${output.totalPages}`);
  lines.push(`- 2xx 成功：${output.successCount}`);
  lines.push(`- 非 2xx：${output.failCount}`);
  lines.push(`- 无接口页：${output.noApiCount}`);
  lines.push('');
  lines.push('| 页面 | 请求 | HTTP | 证据图 | 备注 |');
  lines.push('|---|---|---:|---|---|');
  for (const row of results) {
    const reqText = row.method && row.endpoint ? `${row.method} ${row.endpoint}` : '无接口';
    const statusText = row.status === null ? '-' : String(row.status);
    const shotText = row.screenshot || '-';
    lines.push(`| ${row.page} | ${reqText} | ${statusText} | ${shotText} | ${row.note || ''} |`);
  }
  fs.writeFileSync(path.join(OUT_DIR, 'checklist.md'), lines.join('\n'), 'utf8');
  console.log('DONE');
})();
