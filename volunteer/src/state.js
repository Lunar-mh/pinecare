/**
 * 青松安护（PineCare）志愿者工作台 - 状态与本地存储管理
 */

export const API_BASE_CANDIDATES = [
  'http://127.0.0.1:3001/api/v1',
  'http://127.0.0.1:3999/api/v1',
];

export const ENDPOINTS = {
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

export const STORAGE_KEYS = {
  apiBase: 'volunteer_api_base',
  token: 'volunteer_token',
  refreshToken: 'volunteer_refresh_token',
  phone: 'volunteer_phone',
  offlineQueue: 'volunteer_offline_queue',
};

export function readStorage(key) {
  try {
    return String(localStorage.getItem(key) || '').trim();
  } catch (_error) {
    return '';
  }
}

export function writeStorage(key, value) {
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

export function normalizeApiBase(url) {
  const raw = String(url || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

export const state = {
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

export function clearSession() {
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
