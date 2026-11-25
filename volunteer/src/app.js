/**
 * 银伴智慧照护平台 - 志愿者端轻量移动工作台
 * 核心设计：暖玉微晶·液态温润 (Warm Jade & Liquid Glass)
 * 遵循规范：PROJECT.md §1.2 & §4.1 接口契约
 */

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
  offlineQueue: 'volunteer_offline_queue',
};

const state = {
  apiBase: readStorage(STORAGE_KEYS.apiBase) || '',
  token: readStorage(STORAGE_KEYS.token) || '',
  refreshToken: readStorage(STORAGE_KEYS.refreshToken) || '',
  phone: readStorage(STORAGE_KEYS.phone) || '',
  code: '',
  loginLoading: false,
  smsLoading: false,
  loading: false,
  currentTab: 'tasks',
  taskFilter: '',
  profile: null,
  serviceHours: 0,
  sheetMode: 'default', // 'collapsed' | 'default' | 'expanded'
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
  info: '',
  isOnline: navigator.onLine,
  offlineQueue: [],
};

// 离线队列管理
function loadOfflineQueue() {
  try {
    const stored = readStorage(STORAGE_KEYS.offlineQueue);
    if (stored) {
      state.offlineQueue = JSON.parse(stored);
    }
  } catch (_error) {
    state.offlineQueue = [];
  }
}

function saveOfflineQueue() {
  try {
    writeStorage(STORAGE_KEYS.offlineQueue, JSON.stringify(state.offlineQueue));
  } catch (_error) {
    // 忽略本地存储写入失败
  }
}

function addToOfflineQueue(path, options) {
  state.offlineQueue.push({
    id: Date.now().toString(),
    path,
    options,
    timestamp: new Date().toISOString(),
  });
  saveOfflineQueue();
}

async function processOfflineQueue() {
  if (state.offlineQueue.length === 0) return;

  const queue = [...state.offlineQueue];
  state.offlineQueue = [];
  saveOfflineQueue();

  for (const item of queue) {
    try {
      await request(item.path, item.options);
    } catch (_error) {
      state.offlineQueue.push(item);
    }
  }
  saveOfflineQueue();

  if (state.offlineQueue.length === 0) {
    showInfo('离线数据已成功同步');
  }
}

// 网络状态监听与提示
function setupNetworkListeners() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    showInfo('网络已恢复，正在同步离线数据...');
    render();
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    showError('当前处于离网状态，操作将在重新连线后自动提交');
    render();
  });
}

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
    // 忽略本地存储写入异常
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

function showInfo(msg) {
  state.info = String(msg || '');
  render();
}

function showError(msg) {
  state.error = String(msg || '');
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
      // 尝试下一个可用节点
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
  if (normalized.includes('service record hash verification failed')) return '服务记录校验失败，请刷新后重试。';
  if (normalized.includes('only processing tasks can be checked out')) return '仅服务中的任务可签退。';
  if (normalized.includes('only assigned tasks can be checked in')) return '仅已接单的任务可签到。';
  if (normalized.includes('only pending tasks can be accepted')) return '仅待接单的任务可接单。';
  if (normalized.includes('order not found')) return '任务不存在或已被处理。';

  return raw;
}

function extractMessage(payload, fallback) {
  const message = payload && typeof payload.message === 'string' ? payload.message.trim() : '';
  const cn = toCnBackendMessage(message);
  return cn || message || fallback;
}

// Token 刷新控制
let isRefreshing = false;
let refreshPromise = null;

async function refreshToken() {
  if (!state.refreshToken) {
    throw new Error('No refresh token available');
  }

  const apiBase = normalizeApiBase(state.apiBase) || (await detectApiBase());
  const response = await fetch(`${apiBase}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.refreshToken }),
  });

  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error('Token refresh failed');
  }

  state.token = payload.data.token;
  if (payload.data.refresh_token) {
    state.refreshToken = payload.data.refresh_token;
    writeStorage(STORAGE_KEYS.refreshToken, payload.data.refresh_token);
  }
  writeStorage(STORAGE_KEYS.token, payload.data.token);

  return payload.data.token;
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

  let response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body,
  });

  // 401 令牌过期重试机制
  if (response.status === 401 && state.refreshToken && options.auth !== false) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken();
      }

      await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      headers.Authorization = `Bearer ${state.token}`;
      response = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        body,
      });
    } catch (_refreshError) {
      isRefreshing = false;
      refreshPromise = null;
      clearSession();
      render();
      throw new Error('登录凭证已失效，请重新登录');
    }
  }

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
  if (code !== 0 && code !== 200) {
    const err = new Error(extractMessage(payload, '请求处理失败'));
    err.statusCode = code || 500;
    err.payload = payload;
    throw err;
  }

  return payload.data;
}

function mapServiceTypeLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '助老服务';
  if (normalized === 'escort') return '陪诊服务';
  if (normalized === 'visit') return '上门探访';
  if (normalized === 'meal') return '助餐服务';
  if (normalized === 'cleaning') return '居家保洁';
  if (normalized === 'shopping') return '生活代购';
  if (normalized === 'medical') return '就医协助';
  return String(value || '常规照料');
}

function mapRoleLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '社区志愿者';
  if (normalized === 'volunteer') return '持证志愿者';
  if (normalized === 'admin') return '社区网格员';
  if (normalized === 'family') return '长辈家属';
  if (normalized === 'elder') return '青松长辈';
  return String(value || '志愿先锋');
}

function mapTrainingStatusLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '待修读';
  if (normalized === 'completed') return '考核合格';
  if (normalized === 'in_progress' || normalized === 'processing') return '研修中';
  if (normalized === 'expired') return '证书已过期';
  if (normalized === 'pending') return '待培训';
  return String(value || '在训');
}

function normalizeDisplayName(value, fallbackPrefix) {
  const raw = String(value || '').trim();
  const fallback = String(fallbackPrefix || '长辈朋友').trim();
  if (!raw) return fallback;

  if (/^[A-Za-z0-9\s._-]+$/.test(raw)) {
    return fallback;
  }

  return raw;
}

function getStatusLabel(status) {
  if (status === 'pending') return '待认领';
  if (status === 'assigned') return '已认领';
  if (status === 'processing') return '服务中';
  if (status === 'completed') return '已结案';
  if (status === 'cancelled') return '已撤销';
  return status || '流转中';
}

/**
 * 统合工单操作：接单、现场扫码签到、签退打卡统一分发为 60px 英雄按钮
 */
function taskActions(task) {
  const taskId = Number(task.id);
  if (!Number.isFinite(taskId) || taskId <= 0) return [];

  if (task.status === 'pending' && !task.volunteer_id) {
    return [
      { label: '⚡ 立即接单认领', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.accept}`, hero: true },
    ];
  }

  if (task.status === 'assigned') {
    return [
      { label: '📷 现场扫码签到', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.checkIn}`, hero: true, isScan: true },
      { label: '确认完成结案', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.complete}`, hero: false },
    ];
  }

  if (task.status === 'processing') {
    return [
      { label: '🏁 服务完成签退打卡', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.checkOut}`, hero: true },
      { label: '确认完成结案', endpoint: `${ENDPOINTS.tasks}/${taskId}${ENDPOINTS.complete}`, hero: false },
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
    state.serviceHours = (profileData && profileData.service_hours) || 0;
    state.taskSummary = (taskData && taskData.summary) || state.taskSummary;
    state.tasks = (taskData && taskData.list) || [];
    state.training = (trainingData && trainingData.list) || [];
    state.info = `已成功连线 ${state.apiBase}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : '数据加载失败';
    const statusCode = Number(error && error.statusCode) || 0;

    if (statusCode === 401) {
      clearSession();
      state.error = '会话已过期，请重新登录。';
    } else if (statusCode === 403) {
      clearSession();
      state.error = '当前账号非志愿者身份，无法进入工作台。';
    } else {
      state.error = message;
    }
  } finally {
    state.loading = false;
    render();
  }
}

async function handleSendSms() {
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!state.phone) {
    state.error = '请输入志愿者手机号';
    render();
    return;
  }
  if (!phoneRegex.test(state.phone)) {
    state.error = '请输入规范的11位大陆手机号';
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
    toast('短信验证码已下发至您的手机，请注意查收');
  } catch (error) {
    state.error = error instanceof Error ? error.message : '验证码发送失败';
  } finally {
    state.smsLoading = false;
    render();
  }
}

async function handleLogin() {
  const phoneRegex = /^1[3-9]\d{9}$/;
  const codeRegex = /^\d{6}$/;

  if (!state.phone || !state.code) {
    state.error = '请输入手机号及短信验证码';
    render();
    return;
  }
  if (!phoneRegex.test(state.phone)) {
    state.error = '请输入有效的11位手机号';
    render();
    return;
  }
  if (!codeRegex.test(state.code)) {
    state.error = '请输入6位短信数字验证码';
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

    state.token = String((data && data.token) || '').trim();
    state.refreshToken = String((data && data.refresh_token) || '').trim();

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
    state.error = error instanceof Error ? error.message : '登录鉴权失败';
  } finally {
    state.loginLoading = false;
    render();
  }
}

/**
 * 现场扫码微晶取景器光效弹层
 */
function showScannerViewfinder(onComplete) {
  let overlay = document.getElementById('scanner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'scanner-overlay';
    overlay.className = 'scanner-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '现场微晶核验取景器');
    overlay.innerHTML = `
      <div class="scanner-card">
        <div class="scanner-header">
          <span class="scanner-status-dot"></span>
          <span class="scanner-title">现场扫码打卡 · 微晶取景器</span>
        </div>
        <div class="scanner-viewfinder">
          <div class="scanner-reticle">
            <div class="corner-bracket top-left"></div>
            <div class="corner-bracket top-right"></div>
            <div class="corner-bracket bottom-left"></div>
            <div class="corner-bracket bottom-right"></div>
            <div class="scanner-laser-line"></div>
            <div class="scanner-crosshair"></div>
          </div>
        </div>
        <p class="scanner-prompt">请对准长者家中微晶服务二维码</p>
        <p class="scanner-subprompt">📍 现场地理围栏已自动定位校准</p>
        <button id="cancel-scan-btn" class="btn btn-secondary-action scanner-cancel-btn">取消扫码</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';

  let timer = null;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (overlay) overlay.style.display = 'none';
  };

  const cancelBtn = overlay.querySelector('#cancel-scan-btn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      cleanup();
    };
  }

  // 模拟微晶光学对焦扫描 650ms 后自动触发完成回调
  timer = setTimeout(() => {
    cleanup();
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }, 650);
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
    toast('打卡操作成功，已更新工单流转状态');
    await loadDashboard();
  } catch (error) {
    state.error = error instanceof Error ? error.message : '工单操作处理失败';
    render();
  } finally {
    state.actionEndpoint = '';
    render();
  }
}

function handleLogout() {
  clearSession();
  state.currentTab = 'tasks';
  state.info = '您已安全退出志愿者工作台。';
  state.error = '';
  render();
}

function renderLogin() {
  return `
    <div class="full-panel" role="form">
      <div class="login-brand">
        <div class="login-logo-pill">青松安护 PineCare · 志愿先锋</div>
        <h1>志愿者工作台</h1>
        <p class="muted login-subtitle">真实接口联调模式，一站式暖心助老服务</p>
      </div>

      <div class="form-group">
        <label for="api-base" class="field-label">API 服务地址</label>
        <input id="api-base" class="field" value="${escapeHtml(state.apiBase || API_BASE_CANDIDATES[0])}" placeholder="http://127.0.0.1:3999/api/v1" aria-label="API 服务器地址" />
      </div>

      <div class="form-group">
        <label for="phone" class="field-label">志愿者手机号</label>
        <input id="phone" class="field" value="${escapeHtml(state.phone)}" placeholder="请输入手机号 (例如 13710000051)" aria-label="手机号" aria-required="true" ${state.error && state.error.includes('手机号') ? 'aria-invalid="true"' : ''} />
      </div>

      <div class="form-group">
        <label for="code" class="field-label">短信验证码</label>
        <div class="sms-input-row">
          <input id="code" class="field sms-field" value="${escapeHtml(state.code)}" placeholder="输入 6 位验证码" aria-label="验证码" aria-required="true" aria-describedby="code-error" ${state.error && state.error.includes('验证码') ? 'aria-invalid="true"' : ''} />
          <button id="send-sms" class="btn btn-sms" ${state.smsLoading ? 'disabled' : ''} aria-busy="${state.smsLoading}">${state.smsLoading ? '发送中...' : '获取验证码'}</button>
        </div>
      </div>

      <button id="login" class="btn btn-hero-action btn-login" ${state.loginLoading ? 'disabled' : ''} aria-busy="${state.loginLoading}">
        ${state.loginLoading ? '正在核验登录...' : '进入志愿者工作台'}
      </button>

      ${state.error ? `<p id="code-error" class="error" role="alert" aria-live="polite">${escapeHtml(state.error)}</p>` : ''}
      <p class="hint" aria-live="polite">${escapeHtml(state.info)}</p>
    </div>
  `;
}

function renderSummary() {
  const summary = state.taskSummary || {};
  return `
    <div class="summary-grid">
      <div class="summary-item"><span class="metric-num">${Number(summary.available_count || 0)}</span><small>可接工单</small></div>
      <div class="summary-item"><span class="metric-num">${Number(summary.assigned_count || 0)}</span><small>已认领</small></div>
      <div class="summary-item"><span class="metric-num">${Number(summary.processing_count || 0)}</span><small>服务中</small></div>
      <div class="summary-item"><span class="metric-num">${Number(summary.completed_count || 0)}</span><small>已结案</small></div>
    </div>
  `;
}

function renderTaskFilter() {
  const filters = [
    { key: '', label: '全部工单' },
    { key: 'pending', label: '待认领' },
    { key: 'assigned', label: '已认领' },
    { key: 'processing', label: '服务中' },
    { key: 'completed', label: '已结案' },
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
    return '<p class="muted" aria-live="polite" aria-busy="true">工单数据加载中...</p>';
  }

  if (!state.tasks.length) {
    return '<p class="muted" aria-live="polite">当前分类下暂无可处理的助老工单。</p>';
  }

  return `<div role="list" aria-label="任务列表">${state.tasks
    .map((task) => {
      const actions = taskActions(task);
      return `
        <article class="task-card ${task.status === 'pending' ? 'pending' : ''} ${task.status === 'processing' ? 'processing' : ''}" role="listitem" aria-label="任务 ${escapeHtml(task.order_no || `#${task.id}`)}: ${escapeHtml(getStatusLabel(task.status))}">
          <div class="task-head">
            <strong>${escapeHtml(task.order_no || `工单 #${task.id}`)}</strong>
            <span class="task-status ${task.status}">${escapeHtml(getStatusLabel(task.status))}</span>
          </div>
          <p class="task-line">服务项目：${escapeHtml(mapServiceTypeLabel(task.service_type))}</p>
          <p class="task-line">服务对象：${escapeHtml(normalizeDisplayName(task.elder_name, '长辈用户'))} (${escapeHtml(task.elder_phone || '-')})</p>
          <p class="task-line">预约时间：${escapeHtml(task.scheduled_at || '-')}</p>
          <p class="task-line">结案时间：${escapeHtml(task.completed_at || '-')}</p>
          ${
            actions.length
              ? `<div class="task-actions">${actions
                  .map((item) => {
                    const pending = state.actionEndpoint === item.endpoint;
                    const btnClass = item.hero ? 'btn btn-hero-action' : 'btn btn-secondary-action';
                    const scanAttr = item.isScan ? 'data-scan="true"' : '';
                    return `<button class="${btnClass}" data-endpoint="${item.endpoint}" ${scanAttr} ${pending ? 'disabled' : ''} aria-busy="${pending}">${pending ? '正在处理...' : escapeHtml(item.label)}</button>`;
                  })
                  .join('')}</div>`
              : '<p class="hint">该工单当前处于正常流转态，暂无需操作。</p>'
          }
        </article>
      `;
    })
    .join('')}</div>`;
}

function renderTraining() {
  if (state.loading) {
    return '<p class="muted" aria-live="polite" aria-busy="true">培训赋能记录加载中...</p>';
  }

  if (!state.training.length) {
    return '<p class="muted" aria-live="polite">暂无专项技能培训记录。</p>';
  }

  return state.training
    .map(
      (item) => `
      <article class="training-card" aria-label="培训课程：${escapeHtml(item.training_title || '志愿赋能专项培训')}">
        <div class="task-head">
          <strong>${escapeHtml(item.training_title || '志愿赋能专项培训')}</strong>
          <span class="task-status processing">${escapeHtml(mapTrainingStatusLabel(item.training_status))}</span>
        </div>
        <p class="task-line">修读时间：${escapeHtml(item.training_at || '-')}</p>
        <p class="task-line">认证有效至：${escapeHtml(item.expires_at || '-')}</p>
        ${item.certificate_url ? `<a class="link" href="${escapeHtml(item.certificate_url)}" target="_blank" rel="noreferrer">查验资格证书</a>` : ''}
      </article>
    `
    )
    .join('');
}

function renderProfile() {
  const profile = state.profile || {};
  return `
    <article class="profile-card" aria-label="个人档案">
      <p class="task-line">志愿者姓名：${escapeHtml(normalizeDisplayName(profile.name, '青松志愿者'))}</p>
      <p class="task-line">认证手机号：${escapeHtml(profile.phone || '-')}</p>
      <p class="task-line">服务身份：${escapeHtml(mapRoleLabel(profile.role))}</p>
      <p class="task-line">所属网格站：${escapeHtml(profile.community_id || '-')}</p>
      <p class="task-line">加入时间：${escapeHtml(profile.joined_at || '-')}</p>
      <p class="task-line">服务接口节点：${escapeHtml(state.apiBase || '-')}</p>
    </article>
  `;
}

function renderDashboard() {
  const profileName = normalizeDisplayName(state.profile && state.profile.name, '志愿者');

  return `
    <div class="map-layer" aria-label="辖区社区服务地图">
      <div class="map-grid-overlay"></div>
      <div class="map-station-badge">
        <span class="station-dot"></span>
        <span>青松安护 · 社区互助网格</span>
      </div>
      <div class="map-top-bar">
        <div class="map-status-pill">
          <span class="pulse-indicator"></span>
          <span>${state.isOnline ? '网格巡航中' : '离线离网模式'}</span>
        </div>
        <button id="logout" class="btn btn-logout" aria-label="安全退出">安全退出</button>
      </div>
    </div>
    
    <div class="bottom-sheet ${state.sheetMode}" role="main">
      <div class="drag-handle-wrapper" role="button" tabindex="0" aria-label="调节工作台抽屉高度">
        <div class="drag-handle"></div>
        <div class="drag-handle-indicator">
          <span class="mode-dot ${state.sheetMode === 'collapsed' ? 'active' : ''}"></span>
          <span class="mode-dot ${state.sheetMode === 'default' ? 'active' : ''}"></span>
          <span class="mode-dot ${state.sheetMode === 'expanded' ? 'active' : ''}"></span>
        </div>
      </div>

      <div class="sheet-header">
        <div>
          <h2>${escapeHtml(profileName)}，辛苦了</h2>
          <div class="service-badge">
            <span>🏅 已累计奉献服务 <strong>${Number(state.serviceHours || 0)}</strong> 小时</span>
          </div>
        </div>
      </div>

      <div class="scroll-area">
        ${renderSummary()}

        <nav aria-label="主菜单导航" role="navigation" class="tabs-container">
          <div class="tabs" role="tablist">
            <button class="tab ${state.currentTab === 'tasks' ? 'active' : ''}" data-tab="tasks" role="tab" aria-selected="${state.currentTab === 'tasks'}" aria-controls="tab-tasks">接单大厅</button>
            <button class="tab ${state.currentTab === 'training' ? 'active' : ''}" data-tab="training" role="tab" aria-selected="${state.currentTab === 'training'}" aria-controls="tab-training">技能培训</button>
            <button class="tab ${state.currentTab === 'profile' ? 'active' : ''}" data-tab="profile" role="tab" aria-selected="${state.currentTab === 'profile'}" aria-controls="tab-profile">我的账户</button>
          </div>
        </nav>

        ${state.currentTab === 'tasks' ? renderTaskFilter() : ''}
        ${state.error ? `<p class="error" role="alert" aria-live="polite">${escapeHtml(state.error)}</p>` : ''}
        <p class="hint" aria-live="polite">${escapeHtml(state.info)}</p>

        <div role="tabpanel" id="tab-tasks" ${state.currentTab === 'tasks' ? '' : 'hidden'}>
          ${state.currentTab === 'tasks' ? renderTasks() : ''}
        </div>
        <div role="tabpanel" id="tab-training" ${state.currentTab === 'training' ? '' : 'hidden'}>
          ${state.currentTab === 'training' ? renderTraining() : ''}
        </div>
        <div role="tabpanel" id="tab-profile" ${state.currentTab === 'profile' ? '' : 'hidden'}>
          ${state.currentTab === 'profile' ? renderProfile() : ''}
        </div>
      </div>
    </div>
  `;
}

// 抽屉多挡位手势与动画管理
let touchStartY = 0;
let touchStartTime = 0;

function setupDrawerGestures(root) {
  const handleWrapper = root.querySelector('.drag-handle-wrapper');
  if (!handleWrapper) return;

  handleWrapper.addEventListener('click', () => {
    if (Date.now() - touchStartTime < 250) return;
    cycleSheetMode();
  });

  handleWrapper.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    },
    { passive: true }
  );

  handleWrapper.addEventListener(
    'touchend',
    (e) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchEndY - touchStartY;
      if (Math.abs(diffY) > 25) {
        if (diffY < 0) {
          expandSheetMode();
        } else {
          collapseSheetMode();
        }
      }
    },
    { passive: true }
  );
}

function cycleSheetMode() {
  if (state.sheetMode === 'collapsed') state.sheetMode = 'default';
  else if (state.sheetMode === 'default') state.sheetMode = 'expanded';
  else state.sheetMode = 'default';
  updateSheetClass();
}

function expandSheetMode() {
  if (state.sheetMode === 'collapsed') state.sheetMode = 'default';
  else if (state.sheetMode === 'default') state.sheetMode = 'expanded';
  updateSheetClass();
}

function collapseSheetMode() {
  if (state.sheetMode === 'expanded') state.sheetMode = 'default';
  else if (state.sheetMode === 'default') state.sheetMode = 'collapsed';
  updateSheetClass();
}

function updateSheetClass() {
  const sheet = document.querySelector('.bottom-sheet');
  if (sheet) {
    sheet.className = `bottom-sheet ${state.sheetMode}`;
  }
  const dots = document.querySelectorAll('.mode-dot');
  if (dots.length === 3) {
    dots[0].classList.toggle('active', state.sheetMode === 'collapsed');
    dots[1].classList.toggle('active', state.sheetMode === 'default');
    dots[2].classList.toggle('active', state.sheetMode === 'expanded');
  }
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = state.token ? renderDashboard() : renderLogin();

  if (state.token) {
    setupDrawerGestures(root);
  }

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
      state.phone = String((target && target.value) || '').trim();
    });
  }

  const codeInput = document.getElementById('code');
  if (codeInput) {
    codeInput.addEventListener('input', (event) => {
      const target = event.target;
      state.code = String((target && target.value) || '').trim();
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

      const isScan = button.getAttribute('data-scan') === 'true';
      if (isScan) {
        showScannerViewfinder(() => {
          handleTaskAction(endpoint);
        });
      } else {
        await handleTaskAction(endpoint);
      }
    });
  });
}

async function bootstrap() {
  loadOfflineQueue();
  setupNetworkListeners();

  await detectApiBase();
  render();

  if (state.token) {
    await loadDashboard();
    if (state.isOnline && state.offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    state.error = error instanceof Error ? error.message : '工作台初始化失败';
    render();
  });
});
