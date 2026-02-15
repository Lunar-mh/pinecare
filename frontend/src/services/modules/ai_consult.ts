/**
 * ai_consult.ts - AI健康顾问相关API
 */

import { get, post, put } from '../request';
import type { ConsultMessage, HealthProfile } from '../types';

// 发送咨询消息
export const sendConsultMessage = (data: { message: string; sessionId: string }) =>
  post<{ reply: string; sessionId: string }>('/ai-consult/chat', data);

// 获取会话历史
export const getConsultHistory = (params: { sessionId: string; limit?: number }) =>
  get<ConsultMessage[]>('/ai-consult/history', params);

// 语音咨询
export const sendVoiceConsult = (data: { audioData: string; sessionId: string }) =>
  post<{ reply: string; audioData?: string }>('/ai-consult/voice', data);

// 获取健康画像
export const getHealthProfile = () =>
  get<HealthProfile>('/ai-consult/profile');

// 更新健康画像
export const updateHealthProfile = (data: Partial<HealthProfile>) =>
  put<void>('/ai-consult/profile', data);
