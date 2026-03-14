import { get, post } from '../request';
import type { ChatMessage, CompanionGame, GameRecord, EmotionTrend, NostalgiaContent } from '../types';

export const sendCompanionMessage = async (data: { message: string }) => {
  const response = await post<{ reply?: string }>('/ai-companion/companion/chat', data);
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: String(response?.reply || '我在这里，我们继续聊。'),
    timestamp: new Date().toISOString(),
    type: 'text',
  } as ChatMessage;
};

export const getCompanionGames = async () => {
  const response = await get<Array<{ id?: string | number; type?: 'memory' | 'matching' | 'word'; name?: string; description?: string; difficulty?: 1 | 2 | 3; icon?: string }>>('/ai-companion/companion/games');
  return (response || []).map((item, index) => ({
    id: String(item.id || index + 1),
    type: item.type || 'memory',
    name: item.name || '记忆练习',
    description: item.description || '轻量认知训练',
    difficulty: item.difficulty || 1,
    icon: item.icon || 'star',
  })) as CompanionGame[];
};

export const recordGameResult = (data: {
  gameType: string;
  score: number;
  difficulty: number;
  durationSeconds: number;
}) => post<GameRecord>('/ai-companion/companion/game/record', data);

export const getEmotionTrend = async (params?: { days?: number }) => {
  const response = await get<{ points?: Array<{ date?: string; avgScore?: number }> }>('/ai-companion/companion/emotion', params);
  return (response?.points || []).map((item) => ({
    date: String(item.date || ''),
    emotionScore: Number(item.avgScore || 0),
  })) as EmotionTrend[];
};

export const getNostalgiaContent = async (params?: { decade?: string }) => {
  const response = await get<{
    songs?: Array<{ id?: string | number; title?: string; intro?: string; decade?: string }>;
    movies?: Array<{ id?: string | number; title?: string; intro?: string; decade?: string }>;
    photos?: Array<{ id?: string | number; title?: string; intro?: string; decade?: string }>;
    decade?: string;
  }>('/ai-companion/companion/nostalgia', params);

  const decade = String(response?.decade || params?.decade || '1980s');
  const songs = (response?.songs || []).map((item, index) => ({
    id: `song-${item.id || index + 1}`,
    type: 'music' as const,
    title: item.title || '经典歌曲',
    description: item.intro || '适合一起回听的老歌',
    decade,
  }));
  const movies = (response?.movies || []).map((item, index) => ({
    id: `movie-${item.id || index + 1}`,
    type: 'story' as const,
    title: item.title || '经典电影',
    description: item.intro || '适合一起回看的影片',
    decade,
  }));
  const photos = (response?.photos || []).map((item, index) => ({
    id: `photo-${item.id || index + 1}`,
    type: 'photo' as const,
    title: item.title || '怀旧照片',
    description: item.intro || '值得回忆的旧时光',
    decade,
  }));

  return [...songs, ...movies, ...photos] as NostalgiaContent[];
};
