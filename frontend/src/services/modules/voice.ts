/**
 * voice.ts - 语音AI相关API
 */

import { get, post } from '../request';
import type { ChatMessage } from '../types';

// 发送语音消息（上传录音后调用）
export const sendVoiceMessage = (data: { audioUrl: string; duration: number }) =>
  post<ChatMessage>('/voice/message', data);

// 发送文本消息
export const sendTextMessage = (content: string) =>
  post<ChatMessage>('/voice/chat', { content });

// 获取聊天历史
export const getChatHistory = (params?: { page?: number; pageSize?: number }) =>
  get<{ list: ChatMessage[]; total: number; hasMore: boolean }>('/voice/history', params);

// 清空聊天历史
export const clearChatHistory = () =>
  post<void>('/voice/history/clear', {});
