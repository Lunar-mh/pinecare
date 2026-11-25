/**
 * 青松安护（PineCare）志愿者工作台 - 网络请求、令牌刷新与离线队列
 */
import {
  API_BASE_CANDIDATES,
  STORAGE_KEYS,
  clearSession,
  normalizeApiBase,
  readStorage,
  state,
  writeStorage,
} from './state.js';
import { extractMessage } from './formatters.js';

let isRefreshing = false;
let refreshPromise = null;
let onStateChange = () => {};

export function setOnStateChange(handler) {
  onStateChange = typeof handler === 'function' ? handler : () => {};
}

export function showInfo(msg) {
  state.info = String(msg || '');
  onStateChange();
}

export function showError(msg) {
  state.error = String(msg || '');
  onStateChange();
}

export function loadOfflineQueue() {
  try {
    const stored = readStorage(STORAGE_KEYS.offlineQueue);
    state.offlineQueue = stored ? JSON.parse(stored) : [];
  } catch (_error) {
    state.offlineQueue = [];
  }
}

export function saveOfflineQueue() {
  try {
    writeStorage(STORAGE_KEYS.offlineQueue, JSON.stringify(state.offlineQueue));
  } catch (_error) {
    // 忽略本地存储写入失败
  }
}

export async function processOfflineQueue() {
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

export function setupNetworkListeners() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    showInfo('网络已恢复，正在同步离线数据...');
    processOfflineQueue();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    showError('当前处于离网状态，操作将在重新连线后自动提交');
  });
}

export async function detectApiBase() {
  const fromInput = normalizeApiBase(state.apiBase);
  const candidates = Array.from(
    new Set([fromInput, normalizeApiBase(readStorage(STORAGE_KEYS.apiBase)), ...API_BASE_CANDIDATES].filter(Boolean))
  );

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

export async function request(path, options = {}) {
  const method = options.method || 'GET';
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  const apiBase = normalizeApiBase(state.apiBase) || (await detectApiBase());
  const headers = { 'Content-Type': 'application/json' };

  if (options.auth !== false && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  let response = await fetch(`${apiBase}${path}`, { method, headers, body });

  if (response.status === 401 && state.refreshToken && options.auth !== false) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken();
      }
      await refreshPromise;
      headers.Authorization = `Bearer ${state.token}`;
      response = await fetch(`${apiBase}${path}`, { method, headers, body });
    } catch (_refreshError) {
      clearSession();
      onStateChange();
      throw new Error('登录凭证已失效，请重新登录');
    } finally {
      isRefreshing = false;
      refreshPromise = null;
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
