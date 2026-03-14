import Taro from '@tarojs/taro';
import {
  API_BASE_URL,
  clearAuthSession,
  get,
  getAccessToken,
  getRefreshToken,
  post,
  put,
  redirectToLogin,
  refreshAccessToken,
} from '../request';
import type { UserInfo, EmergencyContact } from '../types';

export interface PageConfigNavAction {
  key: string;
  label: string;
  description: string;
  icon: string;
  path: string;
  badge?: string;
}

export interface PageConfigCluster {
  key: string;
  title: string;
  description: string;
  items: PageConfigNavAction[];
}

export interface UserPageConfig {
  servicesByRole: Record<'elder' | 'family', PageConfigCluster[]>;
  profileSectionsByRole: Record<'elder' | 'family', Array<{ key: string; title: string; items: PageConfigNavAction[] }>>;
  settingsItems: PageConfigNavAction[];
  about: {
    appName: string;
    appVersion: string;
    effectiveDate: string;
    summary: string;
    documents: Array<{
      key: string;
      title: string;
      version: string;
      effectiveDate: string;
      summary: string;
    }>;
    changelog: string[];
  };
  profileMeta: {
    completion: number;
    appVersion: string;
  };
}

// Auth
export const sendSmsCode = (phone: string) => post<void>('/auth/sms-code', { phone, purpose: 'login' });

export const loginByWechat = (code: string) =>
  post<{ token: string; refresh_token?: string; expires_in?: number; userInfo: UserInfo }>('/auth/wechat', { code });

export const loginByPhone = (phone: string, code: string) =>
  post<{ token: string; refresh_token?: string; expires_in?: number; userInfo: UserInfo }>('/auth/phone', { phone, code });

// Profile
export const getUserInfo = () => get<UserInfo>('/user/info');

export const updateUserInfo = (data: Partial<UserInfo>) => put<UserInfo>('/user/info', data);

export const getUserPageConfig = () => get<UserPageConfig>('/user/page-config');

type UploadEnvelope = {
  code?: number;
  message?: string;
  data?: unknown;
};

function parseUploadEnvelope(raw: string): UploadEnvelope | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UploadEnvelope;
  } catch (_error) {
    return null;
  }
}

function isUnauthorizedUpload(statusCode: number, envelope: UploadEnvelope | null): boolean {
  return statusCode === 401 || Number(envelope?.code || 0) === 401;
}

async function uploadAvatarOnce(filePath: string, token: string) {
  return await Taro.uploadFile({
    url: `${API_BASE_URL}/user/avatar`,
    filePath,
    name: 'file',
    header: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function uploadAvatar(filePath: string) {
  let token = getAccessToken();
  let result = await uploadAvatarOnce(filePath, token);
  let envelope = parseUploadEnvelope(result.data);

  if (isUnauthorizedUpload(result.statusCode, envelope) && getRefreshToken()) {
    try {
      token = await refreshAccessToken();
      result = await uploadAvatarOnce(filePath, token);
      envelope = parseUploadEnvelope(result.data);
    } catch (_error) {
      clearAuthSession();
      redirectToLogin();
      throw new Error('登录状态已过期，请重新登录。');
    }
  }

  if (isUnauthorizedUpload(result.statusCode, envelope)) {
    clearAuthSession();
    redirectToLogin();
    throw new Error('登录状态已过期，请重新登录。');
  }

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(envelope?.message || '头像上传失败，请稍后重试。');
  }

  if (envelope && envelope.code !== undefined && envelope.code !== 0 && envelope.code !== 200) {
    throw new Error(envelope.message || '头像上传失败，请稍后重试。');
  }

  return result;
}

// Emergency contacts
export const getEmergencyContacts = () => get<EmergencyContact[]>('/user/emergency-contacts');

export const addEmergencyContact = (data: Omit<EmergencyContact, 'id'>) =>
  post<EmergencyContact>('/user/emergency-contacts', data);

export const updateEmergencyContact = (id: string, data: Partial<EmergencyContact>) =>
  put<EmergencyContact>(`/user/emergency-contacts/${id}`, data);

export const deleteEmergencyContact = (id: string) => post<void>(`/user/emergency-contacts/${id}/delete`);

export const setPrimaryContact = (id: string) => put<void>(`/user/emergency-contacts/${id}/primary`);

