import { get, post, put } from '../request';
import type { ConsultMessage, HealthProfile } from '../types';

// 发送咨询消息
export const sendConsultMessage = async (data: { message: string; sessionId: string }): Promise<ConsultMessage> => {
  const response = await post<{ 
    reply: string; 
    sessionId: string;
    id?: string | number;
    created_at?: string;
  }>('/ai-consult/chat', data);
  
  return {
    id: String(response.id || `reply-${Date.now()}`),
    role: 'assistant',
    content: response.reply,
    sessionId: response.sessionId,
    createdAt: response.created_at || new Date().toISOString(),
  };
};

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

// 通知家属（当长辈咨询重要健康问题时）
export const notifyFamilyAboutConsult = (data: { 
  consultId: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
}) => post<{ notified: boolean }>('/ai-consult/notify-family', data);

// 关键词列表 - 检测是否需要通知家属
export const ALERT_KEYWORDS = [
  '胸痛', '胸闷', '心绞痛', '心梗',
  '头晕', '头痛', '晕倒', '摔倒',
  '呼吸困难', '喘不上气',
  '血压高', '血压低',
  '血糖高', '血糖低',
  '发烧', '高烧',
  '出血', '吐血', '便血',
  '中风', '偏瘫', '麻木',
  '药物过敏', '过敏反应',
  '疼痛剧烈', '剧痛',
];

// 检测消息是否包含需要通知家属的关键词
export const shouldNotifyFamily = (message: string): { should: boolean; urgency: 'low' | 'medium' | 'high'; keywords: string[] } => {
  const foundKeywords = ALERT_KEYWORDS.filter(keyword => message.includes(keyword));
  
  if (foundKeywords.length === 0) {
    return { should: false, urgency: 'low', keywords: [] };
  }
  
  // 高优先级关键词
  const highPriorityKeywords = ['胸痛', '心梗', '晕倒', '摔倒', '中风', '出血', '吐血', '便血'];
  const hasHighPriority = foundKeywords.some(k => highPriorityKeywords.includes(k));
  
  return {
    should: true,
    urgency: hasHighPriority ? 'high' : 'medium',
    keywords: foundKeywords,
  };
};
