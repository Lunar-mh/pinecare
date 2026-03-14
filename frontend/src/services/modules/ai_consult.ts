import { get, post, put } from '../request';
import type { ConsultMessage, HealthProfile } from '../types';

export const sendConsultMessage = (data: { message: string; sessionId: string }) =>
  post<{ reply: string; sessionId: string }>('/ai-consult/chat', data);

export const getConsultHistory = async (params: { sessionId: string; limit?: number }) => {
  const response = await get<{ records?: Array<{ id?: string | number; role?: 'user' | 'assistant'; content?: string; session_id?: string; created_at?: string }> }>('/ai-consult/history', params);
  return (response?.records || []).map((item) => ({
    id: String(item.id || ''),
    role: item.role || 'assistant',
    content: String(item.content || ''),
    sessionId: String(item.session_id || params.sessionId),
    createdAt: String(item.created_at || new Date().toISOString()),
  })) as ConsultMessage[];
};

export const sendVoiceConsult = (data: { audioData: string; sessionId: string }) =>
  post<{ reply: string; audioData?: string }>('/ai-consult/voice', data);

export const getHealthProfile = async () => {
  const response = await get<{ profile?: HealthProfile | null }>('/ai-consult/profile');
  return (response?.profile || null) as HealthProfile | null;
};

export const updateHealthProfile = (data: Partial<HealthProfile>) =>
  put<void>('/ai-consult/profile', data);
