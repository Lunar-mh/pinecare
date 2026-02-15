/**
 * sos.ts - SOS紧急求助相关API
 */

import { get, post, put } from '../request';
import type { SOSEvent, EmergencyContactWithLocation, SOSResponder } from '../types';

// ==================== SOS触发与状态 ====================

// 触发SOS紧急求助
export const triggerSOS = (data: {
  type: 'manual' | 'fall' | 'abnormal_vital';
  location?: { latitude: number; longitude: number; address?: string };
}) =>
  post<SOSEvent>('/sos/trigger', data);

// 获取当前SOS状态
export const getCurrentSOSStatus = () =>
  get<{ active: boolean; event?: SOSEvent }>('/sos/status');

// 取消SOS求助（误触）
export const cancelSOS = (eventId: string) =>
  post<void>(`/sos/${eventId}/cancel`);

// 标记SOS已解决
export const resolveSOS = (eventId: string) =>
  post<void>(`/sos/${eventId}/resolve`);

// ==================== SOS事件记录 ====================

// 获取SOS事件历史
export const getSOSEvents = (params: { page?: number; pageSize?: number }) =>
  get<{ list: SOSEvent[]; total: number; page: number; pageSize: number; hasMore: boolean }>
    ('/sos/events', params);

// 获取单个SOS事件详情
export const getSOSEvent = (eventId: string) =>
  get<SOSEvent & { responders: SOSResponder[] }>(`/sos/events/${eventId}`);

// ==================== 紧急联系人 ====================

// 获取可通知的紧急联系人列表（带位置信息）
export const getEmergencyContactsWithLocation = () =>
  get<EmergencyContactWithLocation[]>('/sos/emergency-contacts');

// 通知指定联系人
export const notifyContact = (eventId: string, contactId: string) =>
  post<void>(`/sos/${eventId}/notify`, { contactId });

// ==================== 位置相关 ====================

// 更新SOS事件位置（用于持续追踪）
export const updateSOSLocation = (eventId: string, location: {
  latitude: number;
  longitude: number;
  address?: string;
}) =>
  put<void>(`/sos/${eventId}/location`, location);

// 获取救援者位置
export const getResponderLocation = (eventId: string, responderId: string) =>
  get<{
    latitude: number;
    longitude: number;
    updatedAt: string;
  }>(`/sos/${eventId}/responders/${responderId}/location`);
