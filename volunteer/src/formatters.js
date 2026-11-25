/**
 * 青松安护（PineCare）志愿者工作台 - 视图文案映射与格式化工具
 */
import { ENDPOINTS } from './state.js';

const SERVICE_TYPE_LABELS = {
  escort: '陪诊服务',
  visit: '上门探访',
  meal: '助餐服务',
  cleaning: '居家保洁',
  shopping: '生活代购',
  medical: '就医协助',
};

const ROLE_LABELS = {
  volunteer: '持证志愿者',
  admin: '社区网格员',
  family: '长辈家属',
  elder: '青松长辈',
};

const TRAINING_STATUS_LABELS = {
  completed: '考核合格',
  in_progress: '研修中',
  processing: '研修中',
  expired: '证书已过期',
  pending: '待培训',
};

const TASK_STATUS_LABELS = {
  pending: '待认领',
  assigned: '已认领',
  processing: '服务中',
  completed: '已结案',
  cancelled: '已撤销',
};

const BACKEND_MESSAGE_RULES = [
  ['service record hash verification failed', '服务记录校验失败，请刷新后重试。'],
  ['only processing tasks can be checked out', '仅服务中的任务可签退。'],
  ['only assigned tasks can be checked in', '仅已接单的任务可签到。'],
  ['only pending tasks can be accepted', '仅待接单的任务可接单。'],
  ['order not found', '任务不存在或已被处理。'],
];

export function escapeHtml(input) {
  const div = document.createElement('div');
  div.textContent = String(input || '');
  return div.innerHTML;
}

export function toCnBackendMessage(message) {
  const raw = String(message || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  const matched = BACKEND_MESSAGE_RULES.find(([pattern]) => normalized.includes(pattern));
  return matched ? matched[1] : raw;
}

export function extractMessage(payload, fallback) {
  const message = payload && typeof payload.message === 'string' ? payload.message.trim() : '';
  return toCnBackendMessage(message) || message || fallback;
}

export function mapServiceTypeLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '助老服务';
  return SERVICE_TYPE_LABELS[normalized] || String(value || '常规照料');
}

export function mapRoleLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '社区志愿者';
  return ROLE_LABELS[normalized] || String(value || '志愿先锋');
}

export function mapTrainingStatusLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '待修读';
  return TRAINING_STATUS_LABELS[normalized] || String(value || '在训');
}

export function normalizeDisplayName(value, fallbackPrefix) {
  const raw = String(value || '').trim();
  const fallback = String(fallbackPrefix || '长辈朋友').trim();
  if (!raw || /^[A-Za-z0-9\s._-]+$/.test(raw)) {
    return fallback;
  }
  return raw;
}

export function getStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status || '流转中';
}

export function taskActions(task) {
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
