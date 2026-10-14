import Taro from '@tarojs/taro';
import { get, post } from '../request';
import type { ChatMessage } from '../types';

const VOICE_SESSION_KEY = 'voice_assistant_session_id';

function createSessionId(): string {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureSessionId(): string {
  try {
    const existing = String(Taro.getStorageSync(VOICE_SESSION_KEY) || '').trim();
    if (existing) return existing;
  } catch (_error) {
    // ignore
  }

  const next = createSessionId();
  try {
    Taro.setStorageSync(VOICE_SESSION_KEY, next);
  } catch (_error) {
    // ignore
  }
  return next;
}

function setSessionId(sessionId?: string): void {
  const next = String(sessionId || '').trim();
  if (!next) return;
  try {
    Taro.setStorageSync(VOICE_SESSION_KEY, next);
  } catch (_error) {
    // ignore
  }
}

export const sendVoiceMessage = async (data: { audioUrl: string; duration: number }) => {
  const sessionId = ensureSessionId();
  const response = await post<{ reply?: string; sessionId?: string }>('/ai-consult/voice', {
    audioData: data.audioUrl,
    sessionId,
  });
  setSessionId(response?.sessionId || sessionId);
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: String(response?.reply || '语音已发送，请继续提问。'),
    timestamp: new Date().toISOString(),
    type: 'text',
  } as ChatMessage;
};

export const sendTextMessage = async (content: string) => {
  const sessionId = ensureSessionId();
  const response = await post<{ reply?: string; sessionId?: string }>('/ai-consult/chat', {
    message: content,
    sessionId,
  });
  const nextSessionId = String(response?.sessionId || sessionId);
  setSessionId(nextSessionId);

  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: String(response?.reply || '我收到你的问题了，我们继续。'),
    timestamp: new Date().toISOString(),
    type: 'text',
  } as ChatMessage;
};

export const getChatHistory = async (params?: { page?: number; pageSize?: number }) => {
  const sessionId = ensureSessionId();
  const response = await get<{ records?: Array<{ id?: string | number; role?: 'user' | 'assistant'; content?: string; created_at?: string }> }>('/ai-consult/history', {
    sessionId,
    limit: params?.pageSize || 20,
  });

  const list = (response?.records || []).map((item) => ({
    id: String(item.id || ''),
    role: item.role || 'assistant',
    content: String(item.content || ''),
    timestamp: String(item.created_at || new Date().toISOString()),
    type: 'text' as const,
  }));

  return {
    list,
    total: list.length,
    hasMore: false,
  };
};

export const clearChatHistory = async () => {
  const sessionId = ensureSessionId();
  await post<void>('/ai-consult/history/clear', { sessionId });
  const next = createSessionId();
  setSessionId(next);
};
