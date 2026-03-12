export interface VoiceCommand {
  id: string;
  command: string;
  action: string;
  parameters?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'voice' | 'action';
  action?: {
    type: string;
    payload: any;
  };
}

export interface ConsultMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sessionId: string;
  createdAt: string;
}

export interface HealthProfile {
  age?: number;
  gender?: 'male' | 'female';
  chronicDiseases?: string[];
  allergies?: string[];
  recentIndicators?: Record<string, any>;
}

export interface CompanionGame {
  id: string;
  type: 'memory' | 'matching' | 'word';
  name: string;
  description: string;
  difficulty: 1 | 2 | 3;
  icon: string;
}

export interface GameRecord {
  id: number;
  gameType: string;
  score: number;
  difficulty: number;
  durationSeconds: number;
  createdAt: string;
}

export interface EmotionTrend {
  date: string;
  emotionScore: number;
  sleepQuality?: number;
  socialFrequency?: number;
}

export interface NostalgiaContent {
  id: string;
  type: 'music' | 'story' | 'photo';
  title: string;
  description?: string;
  decade: string;
  coverUrl?: string;
  url?: string;
}
