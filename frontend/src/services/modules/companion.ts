/**
 * companion.ts - AI陪伴相关API
 */

import { get, post } from '../request';
import type { ChatMessage, CompanionGame, GameRecord, EmotionTrend, NostalgiaContent } from '../types';

// 发送陪伴对话消息
export const sendCompanionMessage = (data: { message: string }) =>
  post<ChatMessage>('/companion/chat', data);

// 获取游戏列表
export const getCompanionGames = () =>
  get<CompanionGame[]>('/companion/games');

// 记录游戏成绩
export const recordGameResult = (data: {
  gameType: string;
  score: number;
  difficulty: number;
  durationSeconds: number;
}) => post<void>('/companion/game/record', data);

// 获取情绪趋势
export const getEmotionTrend = (params?: { days?: number }) =>
  get<EmotionTrend[]>('/companion/emotion', params);

// 怀旧内容推荐
export const getNostalgiaContent = (params?: { decade?: string }) =>
  get<NostalgiaContent[]>('/companion/nostalgia', params);
