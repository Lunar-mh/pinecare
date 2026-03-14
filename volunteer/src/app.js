const API_BASE_CANDIDATES = [
  'http://127.0.0.1:3001/api/v1',
  'http://127.0.0.1:3999/api/v1',
];

const ENDPOINTS = {
  sendSms: '/auth/sms-code',
  login: '/auth/phone',
  profile: '/volunteer/profile',
  tasks: '/volunteer/tasks',
  training: '/volunteer/training',
  accept: '/accept',
  checkIn: '/check-in',
  checkOut: '/check-out',
  complete: '/complete',
};

const STORAGE_KEYS = {
  apiBase: 'volunteer_api_base',
  token: 'volunteer_token',
  refreshToken: 'volunteer_refresh_token',
  phone: 'volunteer_phone',
};

const state = {
  apiBase: readStorage(STORAGE_KEYS.apiBase) || '',
  token: readStorage(STORAGE_KEYS.token) || '',
  refreshToken: readStorage(STORAGE_KEYS.refreshToken) || '',
  phone: readStorage(STORAGE_KEYS.phone) || '13710000051',
  code: '000000',
  loginLoading: false,
  smsLoading: false,
  loading: false,
  currentTab: 'tasks',
  taskFilter: '',
  profile: null,
  taskSummary: {
    available_count: 0,
    assigned_count: 0,
    processing_count: 0,
    completed_count: 0,
  },
  tasks: [],
  training: [],
  error: '',
  actionEndpoint: '',
  info: '当前默认验证码支持 000000（非 live 模式）。',
};

function readStorage(key) {
  try {
    return String(localStorage.getItem(key) || '').trim();
  } catch (_error) {
    return '';
  }
}

function writeStorage(key, value) {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch (_error) {
    // ignore local storage failures
  }
}

function escapeHtml(input) {
  const div = document.createElement('div');
  div.textContent = String(input || '');
  return div.innerHTML;
}

function distinct(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeApiBase(url) {
  const raw = String(url || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  if (raw.endsWith('/api/v1')) return raw;
  return `${raw}/api/v1`;
}

function toast(message) {
  state.info = String(message || '');
  render();
}

function clearSession() {
  state.token = '';
  state.refreshToken = '';
  state.profile = null;
  state.tasks = [];
  state.training = [];
  state.taskSummary = {
    available_count: 0,
    assigned_count: 0,
    processing_count: 0,
    completed_count: 0,
  };
  writeStorage(STORAGE_KEYS.token, '');
  writeStorage(STORAGE_KEYS.refreshToken, '');
}

async function detectApiBase() {
  const fromInput = normalizeApiBase(state.apiBase);
  const candidates = distinct([
    fromInput,
    normalizeApiBase(readStorage(STORAGE_KEYS.apiBase)),
    ...API_BASE_CANDIDATES,
  ]);

  for (const candidate of candidates) {
    const healthUrl = `${candidate.replace(/\/api\/v1$/, '')}/health`;
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      if (res.ok) {
        state.apiBase = candidate;
        writeStorage(STORAGE_KEYS.apiBase, candidate);
        return candidate;
      }
    } catch (_error) {
      // try next candidate
    }
  }

  const fallback = fromInput || API_BASE_CANDIDATES[0];
  state.apiBase = fallback;
  writeStorage(STORAGE_KEYS.apiBase, fallback);
  return fallback;
}

function toCnBackendMessage(message) {
  const raw = String(message || '').trim();
  if (!raw) return '';

  const normalized = raw.toLowerCase();
  if (normalized.includes('service record hash verification failed')) return '\u670d\u52a1\u8bb0\u5f55\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u540e\u91cd\u8bd5\u3002';
  if (normalized.includes('only processing tasks can be checked out')) return '\u4ec5\u670d\u52a1\u4e2d\u7684\u4efb\u52a1\u53ef\u7b7e\u9000\u3002';
  if (normalized.includes('only assigned tasks can be checked in')) return '\u4ec5\u5df2\u63a5\u5355\u7684\u4efb\u52a1\u53ef\u7b7e\u5230\u3002';
  if (normalized.includes('only pending tasks can be accepted')) return '\u4ec5\u5f85\u63a5\u5355\u7684\u4efb\u52a1\u53ef\u63a5\u5355\u3002';
  if (normalized.includes('order not found')) return '\u4efb\u52a1\u4e0d\u5b58\u5728\u6216\u5df2\u88ab\u5904\u7406\u3002';

  return raw;
}

function extractMessage(payload, fallback) {
  const message = payload && typeof payload.message === 'string' ? payload.message.trim() : '';
  const cn = toCnBackendMessage(message);
  return cn || message || fallback;
}

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const apiBase = normalizeApiBase(state.apiBase) || (await detectApiBase());

  const headers = {
    'Content-Type': 'application/json',
  };

  if (options.auth !== false && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    const err = new Error(extractMessage(payload, `HTTP ${response.status}`));
    err.statusCode = response.status;
    err.payload = payload;
    throw err;
  }

  const code = Number(payload && payload.code);
  if (code !== 0) {
    const err = new Error(extractMessage(payload, '请求失败'));
    err.statusCode = Number(payload && payload.code) || 500;
    err.payload = payload;
    throw err;
  }

  return payload.data;
}

function mapServiceTypeLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'escort') return '\u966a\u8bca\u670d\u52a1';
  if (normalized === 'visit') return '\u4e0a\u95e8\u63a2\u8bbf';
  if (normalized === 'meal') return '\u52a9\u9910\u670d\u52a1';
  if (normalized === 'cleaning') return '\u5c45\u5bb6\u6e05\u6d01';
  if (normalized === 'shopping') return '\u4ee3\u8d2d\u670d\u52a1';
  if (normalized === 'medical') return '\u5c31\u533b\u534f\u52a9';
  return String(value || '-');
}

function mapRoleLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'volunteer') return '\u5fd7\u613f\u8005';
  if (normalized === 'admin') return '\u7ba1\u7406\u5458';
  if (normalized === 'family') return '\u5bb6\u5c5e';
  if (normalized === 'elder') return '\u957f\u8f88';
  return String(value || '-');
}

function mapTrainingStatusLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'completed') return '\u5df2\u5b8c\u6210';
  if (normalized === 'in_progress' || normalized === 'processing') return '\u8fdb\u884c\u4e2d';
  if (normalized === 'expired') return '\u5df2\u8fc7\u671f';
  if (normalized === 'pending') return '\u5f85\u53c2\u52a0';
  return String(value || '-');
}

function normalizeDisplayName(value, fallbackPrefix) {
  const raw = String(value || '').trim();
  const fallback = String(fallbackPrefix || '\u7528\u6237').trim();
  if (!raw) return fallback;

  // ???????????????????????
  if (/^[A-Za-z0-9\s._-]+$/.test(raw)) {
    return fallback;
  }

  return raw;
}

function getStatusLabel(status) {
  if (status === 'pending') return '待接单';
  if (status === 'assigned') return '已接单';
  if (status === 'processing') return '服务中';
  if (status === 'completed') return '已完成';
  if (status === 'cancelled') return '已取消';
  return status || '未知';
}

function taskActions(task) {
  const taskId = Number(task.id);
  if (!Number.isFinite(taskId) || taskId <= 0) return [];

  if (task.status === 'pending' && !task.volunteer_id) {
    return [{ label: '接单', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.accept}` }];
  }

  if (task.status === 'assigned') {
    return [
      { label: '\u7b7e\u5230', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.checkIn}` },
      { label: '\u5b8c\u6210', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.complete}` },
    ];
  }

  if (task.status === 'processing') {
    return [
      { label: '\u7b7e\u9000', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.checkOut}` },
      { label: '\u5b8c\u6210', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.complete}` },
    ];
  }

  return [];
}

async function loadDashboard() {
  state.loading = true;
  state.error = '';
  render();

  try {
    const query = state.taskFilter ? `?status=${encodeURIComponent(state.taskFilter)}&page=1&pageSize=20` : '?page=1&pageSize=20';
    const [profileData, taskData, trainingData] = await Promise.all([
      request(ENDPOINTS.profile),
      request(`${ENDPOINTS.tasks}${query}`),
      request(`${ENDPOINTS.training}?page=1&pageSize=10`),
    ]);

    state.profile = profileData || null;
    state.taskSummary = (taskData && taskData.summary) || state.taskSummary;
    state.tasks = (taskData && taskData.list) || [];
    state.training = (trainingData && trainingData.list) || [];
    state.info = `已连接 ${state.apiBase}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载失败';
    const statusCode = Number(error && error.statusCode) || 0;

    if (statusCode === 401) {
      clearSession();
      state.error = '会话已失效，请重新登录。';
    } else if (statusCode === 403) {
      clearSession();
      state.error = '当前账号不是志愿者身份，无法进入志愿者执行端。';
    } else {
      state.error = message;
    }
  } finally {
    state.loading = false;
    render();
  }
}

async function handleSendSms() {
  if (!state.phone) {
    state.error = '请输入手机号';
    render();
    return;
  }

  state.smsLoading = true;
  state.error = '';
  render();

  try {
    await detectApiBase();
    await request(ENDPOINTS.sendSms, {
      method: 'POST',
      auth: false,
      body: { phone: state.phone, purpose: 'login' },
    });
    toast('验证码已发送（非 live 模式可直接使用 000000）');
  } catch (error) {
    state.error = error instanceof Error ? error.message : '发送验证码失败';
  } finally {
    state.smsLoading = false;
    render();
  }
}

async function handleLogin() {
  if (!state.phone || !state.code) {
    state.error = '请输入手机号和验证码';
    render();
    return;
  }

  state.loginLoading = true;
  state.error = '';
  render();

  try {
    await detectApiBase();
    const data = await request(ENDPOINTS.login, {
      method: 'POST',
      auth: false,
      body: {
        phone: state.phone,
        code: state.code,
      },
    });

    state.token = String(data && data.token || '').trim();
    state.refreshToken = String(data && data.refresh_token || '').trim();

    if (!state.token) {
      throw new Error('登录成功但未返回访问令牌。');
    }

    writeStorage(STORAGE_KEYS.apiBase, state.apiBase);
    writeStorage(STORAGE_KEYS.token, state.token);
    writeStorage(STORAGE_KEYS.refreshToken, state.refreshToken);
    writeStorage(STORAGE_KEYS.phone, state.phone);

    state.currentTab = 'tasks';
    await loadDashboard();
  } catch (error) {
    state.error = error instanceof Error ? error.message : '登录失败';
  } finally {
    state.loginLoading = false;
    render();
  }
}

async function handleTaskAction(endpoint) {
  const normalizedEndpoint = String(endpoint || '').trim();
  if (!normalizedEndpoint || state.actionEndpoint) {
    return;
  }

  state.actionEndpoint = normalizedEndpoint;
  state.error = '';
  render();

  try {
    await request(normalizedEndpoint, {
      method: 'POST',
      body: {},
    });
    toast('\u64cd\u4f5c\u6210\u529f\uff0c\u6b63\u5728\u5237\u65b0\u4efb\u52a1\u72b6\u6001\u3002');
    await loadDashboard();
  } catch (error) {
    state.error = error instanceof Error ? error.message : '\u4efb\u52a1\u64cd\u4f5c\u5931\u8d25';
    render();
  } finally {
    state.actionEndpoint = '';
    render();
  }
}

function handleLogout() {
  clearSession();
  state.currentTab = 'tasks';
  state.info = '你已退出登录。';
  state.error = '';
  render();
}

function renderLogin() {
  return `
    <main class="vol-shell">
      <section class="vol-card">
        <h1>志愿者执行端</h1>
        <p class="muted">真实接口联调模式，不再使用静态演示数据。</p>

        <label class="field-label">API 基线</label>
        <input id="api-base" class="field" value="${escapeHtml(state.apiBase || API_BASE_CANDIDATES[0])}" placeholder="http://127.0.0.1:3999/api/v1" />

        <label class="field-label">手机号</label>
        <input id="phone" class="field" value="${escapeHtml(state.phone)}" placeholder="例如 13710000051" />

        <label class="field-label">验证码</label>
        <div class="field-row">
          <input id="code" class="field" value="${escapeHtml(state.code)}" placeholder="输入验证码" />
          <button id="send-sms" class="btn btn-light" ${state.smsLoading ? 'disabled' : ''}>${state.smsLoading ? '发送中...' : '获取验证码'}</button>
        </div>

        ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
        <p class="hint">${escapeHtml(state.info)}</p>

        <button id="login" class="btn btn-primary" ${state.loginLoading ? 'disabled' : ''}>${state.loginLoading ? '登录中...' : '登录并进入任务台'}</button>
      </section>
    </main>
  `;
}

function renderSummary() {
  const summary = state.taskSummary || {};
  return `
    <div class="summary-grid">
      <div class="summary-item"><span>${Number(summary.available_count || 0)}</span><small>可接任务</small></div>
      <div class="summary-item"><span>${Number(summary.assigned_count || 0)}</span><small>已接单</small></div>
      <div class="summary-item"><span>${Number(summary.processing_count || 0)}</span><small>服务中</small></div>
      <div class="summary-item"><span>${Number(summary.completed_count || 0)}</span><small>已完成</small></div>
    </div>
  `;
}

function renderTaskFilter() {
  const filters = [
    { key: '', label: '全部' },
    { key: 'pending', label: '待接单' },
    { key: 'assigned', label: '已接单' },
    { key: 'processing', label: '服务中' },
    { key: 'completed', label: '已完成' },
  ];

  return `
    <div class="filter-row">
      ${filters
        .map((item) => {
          const cls = state.taskFilter === item.key ? 'chip active' : 'chip';
          return `<button class="${cls}" data-filter="${item.key}">${item.label}</button>`;
        })
        .join('')}
    </div>
  `;
}

function renderTasks() {
  if (state.loading) {
    return '<p class="muted">任务加载中...</p>';
  }

  if (!state.tasks.length) {
    return '<p class="muted">当前没有可处理任务。</p>';
  }

  return state.tasks
    .map((task) => {
      const actions = taskActions(task);
      return `
        <article class="task-card ${task.status === 'pending' ? 'pending' : ''}">
          <div class="task-head">
            <strong>${escapeHtml(task.order_no || `任务 #${task.id}`)}</strong>
            <span class="task-status">${escapeHtml(getStatusLabel(task.status))}</span>
          </div>
          <p class="task-line">服务类型：${escapeHtml(mapServiceTypeLabel(task.service_type))}</p>
          <p class="task-line">服务对象：${escapeHtml(normalizeDisplayName(task.elder_name, '\u957f\u8f88\u7528\u6237'))} (${escapeHtml(task.elder_phone || '-')})</p>
          <p class="task-line">预约时间：${escapeHtml(task.scheduled_at || '-')}</p>
          <p class="task-line">完成时间：${escapeHtml(task.completed_at || '-')}</p>
          ${
            actions.length
              ? `<div class="task-actions">${actions
                  .map((item) => { const pending = state.actionEndpoint === item.endpoint; return `<button class=\"btn btn-primary\" data-endpoint=\"${item.endpoint}\" ${pending ? 'disabled' : ''}>${pending ? '\\u5904\\u7406\\u4e2d...' : escapeHtml(item.label)}</button>`; })
                  .join('')}</div>`
              : '<p class="hint">该任务当前无需操作。</p>'
          }
        </article>
      `;
    })
    .join('');
}

function renderTraining() {
  if (state.loading) {
    return '<p class="muted">培训记录加载中...</p>';
  }

  if (!state.training.length) {
    return '<p class="muted">暂无培训记录。</p>';
  }

  return state.training
    .map(
      (item) => `
      <article class="training-card">
        <div class="task-head">
          <strong>${escapeHtml(item.training_title || '培训课程')}</strong>
          <span class="task-status">${escapeHtml(mapTrainingStatusLabel(item.training_status))}</span>
        </div>
        <p class="task-line">培训时间：${escapeHtml(item.training_at || '-')}</p>
        <p class="task-line">有效期至：${escapeHtml(item.expires_at || '-')}</p>
        ${item.certificate_url ? `<a class="link" href="${escapeHtml(item.certificate_url)}" target="_blank" rel="noreferrer">查看证书</a>` : ''}
      </article>
    `
    )
    .join('');
}

function renderProfile() {
  const profile = state.profile || {};
  return `
    <article class="profile-card">
      <p class="task-line">姓名：${escapeHtml(normalizeDisplayName(profile.name, '\u5fd7\u613f\u8005'))}</p>
      <p class="task-line">手机号：${escapeHtml(profile.phone || '-')}</p>
      <p class="task-line">角色：${escapeHtml(mapRoleLabel(profile.role))}</p>
      <p class="task-line">社区 ID：${escapeHtml(profile.community_id || '-')}</p>
      <p class="task-line">加入时间：${escapeHtml(profile.joined_at || '-')}</p>
      <p class="task-line">当前 API：${escapeHtml(state.apiBase || '-')}</p>
    </article>
  `;
}

function renderDashboard() {
  const profileName = normalizeDisplayName(state.profile && state.profile.name, '\u5fd7\u613f\u8005');

  return `
    <main class="vol-shell">
      <header class="topbar">
        <div>
          <h1>${escapeHtml(profileName)}，辛苦了</h1>
          <p class="muted">任务执行链路：接单 -> 签到 -> 签退 -> 完成</p>
        </div>
        <button id="logout" class="btn btn-light">退出</button>
      </header>

      ${renderSummary()}

      <nav class="tabs">
        <button class="tab ${state.currentTab === 'tasks' ? 'active' : ''}" data-tab="tasks">任务</button>
        <button class="tab ${state.currentTab === 'training' ? 'active' : ''}" data-tab="training">培训</button>
        <button class="tab ${state.currentTab === 'profile' ? 'active' : ''}" data-tab="profile">我的</button>
      </nav>

      ${state.currentTab === 'tasks' ? renderTaskFilter() : ''}
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
      <p class="hint">${escapeHtml(state.info)}</p>

      <section class="panel">
        ${state.currentTab === 'tasks' ? renderTasks() : ''}
        ${state.currentTab === 'training' ? renderTraining() : ''}
        ${state.currentTab === 'profile' ? renderProfile() : ''}
      </section>
    </main>
  `;
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `<div class="vol-container">${state.token ? renderDashboard() : renderLogin()}</div>`;

  const apiInput = document.getElementById('api-base');
  if (apiInput) {
    apiInput.addEventListener('input', (event) => {
      const target = event.target;
      state.apiBase = normalizeApiBase(target && target.value);
    });
  }

  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (event) => {
      const target = event.target;
      state.phone = String(target && target.value || '').trim();
    });
  }

  const codeInput = document.getElementById('code');
  if (codeInput) {
    codeInput.addEventListener('input', (event) => {
      const target = event.target;
      state.code = String(target && target.value || '').trim();
    });
  }

  const sendSmsBtn = document.getElementById('send-sms');
  if (sendSmsBtn) {
    sendSmsBtn.addEventListener('click', handleSendSms);
  }

  const loginBtn = document.getElementById('login');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const tabButtons = root.querySelectorAll('[data-tab]');
  tabButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const tab = button.getAttribute('data-tab') || 'tasks';
      state.currentTab = tab;
      render();
      if (tab !== 'tasks' && tab !== 'training') return;
      await loadDashboard();
    });
  });

  const filterButtons = root.querySelectorAll('[data-filter]');
  filterButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const nextFilter = button.getAttribute('data-filter') || '';
      state.taskFilter = nextFilter;
      await loadDashboard();
    });
  });

  const actionButtons = root.querySelectorAll('[data-endpoint]');
  actionButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const endpoint = button.getAttribute('data-endpoint') || '';
      if (!endpoint) return;
      await handleTaskAction(endpoint);
    });
  });
}

async function bootstrap() {
  await detectApiBase();
  render();

  if (state.token) {
    await loadDashboard();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    state.error = error instanceof Error ? error.message : '初始化失败';
    render();
  });
});
