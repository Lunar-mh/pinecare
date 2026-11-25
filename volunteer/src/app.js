/**
 * 青松安护（PineCare）志愿者工作台 - 主入口与事件编排
 */
import {
  ENDPOINTS,
  STORAGE_KEYS,
  clearSession,
  normalizeApiBase,
  state,
  writeStorage,
} from './state.js';
import {
  detectApiBase,
  loadOfflineQueue,
  processOfflineQueue,
  request,
  setOnStateChange,
  setupNetworkListeners,
  showInfo,
} from './api.js';
import {
  renderDashboard,
  renderLogin,
  setupDrawerGestures,
  showScannerViewfinder,
} from './views.js';

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_REGEX = /^\d{6}$/;

async function loadDashboard() {
  state.loading = true;
  state.error = '';
  render();

  try {
    const query = state.taskFilter
      ? `?status=${encodeURIComponent(state.taskFilter)}&page=1&pageSize=20`
      : '?page=1&pageSize=20';
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
    const statusCode = Number(error && error.statusCode) || 0;
    if (statusCode === 401) {
      clearSession();
      state.error = '会话已过期，请重新登录。';
    } else if (statusCode === 403) {
      clearSession();
      state.error = '当前账号非志愿者身份，无法进入工作台。';
    } else {
      state.error = error instanceof Error ? error.message : '数据加载失败';
    }
  } finally {
    state.loading = false;
    render();
  }
}

async function handleSendSms() {
  if (!state.phone || !PHONE_REGEX.test(state.phone)) {
    state.error = !state.phone ? '请输入志愿者手机号' : '请输入规范的11位大陆手机号';
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
    showInfo('短信验证码已下发至您的手机，请注意查收');
  } catch (error) {
    state.error = error instanceof Error ? error.message : '验证码发送失败';
  } finally {
    state.smsLoading = false;
    render();
  }
}

async function handleLogin() {
  if (!state.phone || !state.code) {
    state.error = '请输入手机号及短信验证码';
    render();
    return;
  }
  if (!PHONE_REGEX.test(state.phone)) {
    state.error = '请输入有效的11位手机号';
    render();
    return;
  }
  if (!CODE_REGEX.test(state.code)) {
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
      body: { phone: state.phone, code: state.code },
    });

    state.token = String((data && data.token) || '').trim();
    state.refreshToken = String((data && data.refresh_token) || '').trim();
    if (!state.token) throw new Error('登录成功但未返回访问令牌。');

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

async function handleTaskAction(endpoint) {
  const normalizedEndpoint = String(endpoint || '').trim();
  if (!normalizedEndpoint || state.actionEndpoint) return;

  state.actionEndpoint = normalizedEndpoint;
  state.error = '';
  render();

  try {
    await request(normalizedEndpoint, { method: 'POST', body: {} });
    showInfo('打卡操作成功，已更新工单流转状态');
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

function bindInputEvents() {
  document.getElementById('api-base')?.addEventListener('input', (e) => {
    state.apiBase = normalizeApiBase(e.target?.value);
  });
  document.getElementById('phone')?.addEventListener('input', (e) => {
    state.phone = String(e.target?.value || '').trim();
  });
  document.getElementById('code')?.addEventListener('input', (e) => {
    state.code = String(e.target?.value || '').trim();
  });
  document.getElementById('send-sms')?.addEventListener('click', handleSendSms);
  document.getElementById('login')?.addEventListener('click', handleLogin);
  document.getElementById('logout')?.addEventListener('click', handleLogout);
}

function bindDashboardEvents(root) {
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.getAttribute('data-tab') || 'tasks';
      state.currentTab = tab;
      render();
      if (tab === 'tasks' || tab === 'training') await loadDashboard();
    });
  });

  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.taskFilter = btn.getAttribute('data-filter') || '';
      await loadDashboard();
    });
  });

  root.querySelectorAll('[data-endpoint]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const endpoint = btn.getAttribute('data-endpoint') || '';
      if (!endpoint) return;
      if (btn.getAttribute('data-scan') === 'true') {
        showScannerViewfinder(() => handleTaskAction(endpoint));
      } else {
        await handleTaskAction(endpoint);
      }
    });
  });
}

function render() {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = state.token ? renderDashboard() : renderLogin();
  if (state.token) setupDrawerGestures(root);
  bindInputEvents();
  bindDashboardEvents(root);
}

async function bootstrap() {
  setOnStateChange(render);
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
