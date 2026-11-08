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
