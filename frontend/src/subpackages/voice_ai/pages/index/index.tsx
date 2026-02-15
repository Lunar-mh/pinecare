import { useState, useEffect, useRef, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { Tips, Heart, Clock, ArrowRight } from '@nutui/icons-react-taro';
import { sendTextMessage, getChatHistory, clearChatHistory } from '@/services/modules/voice';
import type { ChatMessage } from '@/services/types';
import './index.scss';

type VoiceState = 'idle' | 'recording' | 'processing';

const QUICK_COMMANDS = [
  { label: '查看血压', icon: '❤️', text: '查看我的血压情况' },
  { label: '今日用药', icon: '💊', text: '今天的用药情况怎么样' },
  { label: '天气查询', icon: '🌤️', text: '今天天气怎么样' },
  { label: '健康提醒', icon: '🔔', text: '有什么健康提醒吗' },
  { label: '联系家人', icon: '📞', text: '帮我联系家人' },
  { label: '设置提醒', icon: '⏰', text: '帮我设置一个提醒' },
];

export default function VoiceAIIndex() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const recordManagerRef = useRef<Taro.RecorderManager | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getChatHistory({ page: 1, pageSize: 20 });
      if (res && res.list && res.list.length > 0) {
        setMessages([...res.list].reverse());
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是银伴智能助手，您可以按住下方按钮说话，或点击快捷指令。有什么可以帮您的吗？',
          timestamp: new Date().toISOString(),
          type: 'text',
        }]);
      }
    } catch (_) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是银伴智能助手，您可以按住下方按钮说话，或点击快捷指令。有什么可以帮您的吗？',
        timestamp: new Date().toISOString(),
        type: 'text',
      }]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const appendMessage = (msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  };

  const handleVoicePress = () => {
    if (voiceState !== 'idle') return;
    const RecorderManager = Taro.getRecorderManager();
    recordManagerRef.current = RecorderManager;

    RecorderManager.onStart(() => {
      setVoiceState('recording');
    });

    RecorderManager.onError(() => {
      setVoiceState('idle');
      Taro.showToast({ title: '录音失败，请重试', icon: 'none' });
    });

    RecorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'aac',
    });
  };

  const handleVoiceRelease = () => {
    if (voiceState !== 'recording' || !recordManagerRef.current) return;

    recordManagerRef.current.onStop(async (res: { tempFilePath: string; duration: number }) => {
      if (res.duration < 500) {
        setVoiceState('idle');
        Taro.showToast({ title: '说话时间太短', icon: 'none' });
        return;
      }
      setVoiceState('processing');

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: '🎤 [语音消息]',
        timestamp: new Date().toISOString(),
        type: 'voice',
      };
      appendMessage(userMsg);

      try {
        const { sendVoiceMessage } = await import('@/services/modules/voice');
        const reply = await sendVoiceMessage({ audioUrl: res.tempFilePath, duration: Math.floor(res.duration) });
        if (reply) {
          appendMessage(reply);
        }
      } catch (_) {
        appendMessage({
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，我没有听清楚，请再说一遍。',
          timestamp: new Date().toISOString(),
          type: 'text',
        });
      } finally {
        setVoiceState('idle');
      }
    });

    recordManagerRef.current.stop();
  };

  const handleVoiceCancel = () => {
    if (recordManagerRef.current && voiceState === 'recording') {
      recordManagerRef.current.stop();
    }
    setVoiceState('idle');
  };

  const handleSendText = async (text: string) => {
    if (!text.trim() || loading) return;
    const content = text.trim();
    setInputText('');
    setShowInput(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    appendMessage(userMsg);

    setLoading(true);
    try {
      const reply = await sendTextMessage(content);
      if (reply) {
        appendMessage(reply);
      }
    } catch (_) {
      appendMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，暂时无法回复，请稍后再试。',
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    Taro.showModal({
      title: '清空聊天',
      content: '确定清空所有聊天记录吗？',
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#e53935',
      success: async (res) => {
        if (res.confirm) {
          try {
            await clearChatHistory();
            setMessages([{
              id: 'welcome-new',
              role: 'assistant',
              content: '聊天记录已清空。有什么可以帮您的吗？',
              timestamp: new Date().toISOString(),
              type: 'text',
            }]);
          } catch (_) { /* noop */ }
        }
      }
    });
  };

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const lastMsgId = messages.length > 0 ? `msg-${messages[messages.length - 1].id}` : undefined;

  return (
    <View className="voice-ai">
      {/* 顶部 */}
      <View className="voice-ai__header">
        <View className="voice-ai__header-info">
          <View className="voice-ai__avatar">
            <Tips size={28} color="#fff" />
          </View>
          <View>
            <Text className="voice-ai__name">银伴助手</Text>
            <Text className="voice-ai__status">
              {voiceState === 'processing' || loading ? '思考中...' : '随时为您服务'}
            </Text>
          </View>
        </View>
        <View className="voice-ai__clear" onClick={handleClearHistory}>
          <Text className="voice-ai__clear-text">清空</Text>
        </View>
      </View>

      {/* 聊天气泡区 */}
      <ScrollView
        className="voice-ai__chat"
        scrollY
        scrollIntoView={lastMsgId}
        scrollWithAnimation
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            id={`msg-${msg.id}`}
            className={`bubble-row bubble-row--${msg.role}`}
          >
            {msg.role === 'assistant' && (
              <View className="bubble-avatar bubble-avatar--ai">
                <Tips size={18} color="#fff" />
              </View>
            )}
            <View className={`bubble bubble--${msg.role}`}>
              <Text className="bubble__text">{msg.content}</Text>
              <Text className="bubble__time">{formatTime(msg.timestamp)}</Text>
            </View>
            {msg.role === 'user' && (
              <View className="bubble-avatar bubble-avatar--user">
                <Text className="bubble-avatar__text">我</Text>
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View className="bubble-row bubble-row--assistant">
            <View className="bubble-avatar bubble-avatar--ai">
              <Tips size={18} color="#fff" />
            </View>
            <View className="bubble bubble--assistant bubble--loading">
              <View className="typing-dots">
                <View className="typing-dots__dot" />
                <View className="typing-dots__dot" />
                <View className="typing-dots__dot" />
              </View>
            </View>
          </View>
        )}
        <View style={{ height: '20px' }} />
      </ScrollView>

      {/* 快捷指令横向滚动 */}
      <ScrollView className="quick-commands" scrollX enableFlex>
        {QUICK_COMMANDS.map((cmd) => (
          <View
            key={cmd.label}
            className="quick-cmd-item"
            onClick={() => handleSendText(cmd.text)}
          >
            <Text className="quick-cmd-item__icon">{cmd.icon}</Text>
            <Text className="quick-cmd-item__label">{cmd.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 底部控制区 */}
      <View className="voice-ai__controls">
        {showInput ? (
          <View className="text-input-bar">
            <Input
              className="text-input-bar__input"
              value={inputText}
              placeholder="输入消息..."
              onInput={(e) => setInputText(e.detail.value)}
              confirmType="send"
              onConfirm={() => handleSendText(inputText)}
            />
            <View
              className="text-input-bar__send"
              onClick={() => handleSendText(inputText)}
            >
              <ArrowRight size={20} color="#fff" />
            </View>
            <View
              className="text-input-bar__cancel"
              onClick={() => { setShowInput(false); setInputText(''); }}
            >
              <Text className="text-input-bar__cancel-text">取消</Text>
            </View>
          </View>
        ) : (
          <View className="voice-controls">
            <View
              className="voice-controls__side"
              onClick={() => setShowInput(true)}
            >
              <Text className="voice-controls__side-icon">⌨️</Text>
              <Text className="voice-controls__side-label">键盘</Text>
            </View>

            <View
              className={`voice-btn ${voiceState === 'recording' ? 'voice-btn--recording' : ''} ${voiceState === 'processing' ? 'voice-btn--processing' : ''}`}
              onTouchStart={handleVoicePress}
              onTouchEnd={handleVoiceRelease}
              onTouchCancel={handleVoiceCancel}
            >
              {voiceState === 'idle' && <Heart size={36} color="#fff" />}
              {voiceState === 'recording' && (
                <View className="recording-wave">
                  <View className="recording-wave__bar" />
                  <View className="recording-wave__bar" />
                  <View className="recording-wave__bar" />
                  <View className="recording-wave__bar" />
                  <View className="recording-wave__bar" />
                </View>
              )}
              {voiceState === 'processing' && <Clock size={32} color="#fff" />}
              <Text className="voice-btn__label">
                {voiceState === 'idle' ? '按住说话' : voiceState === 'recording' ? '松开发送' : '处理中...'}
              </Text>
            </View>

            <View className="voice-controls__side">
              <Text className="voice-controls__side-icon">🔊</Text>
              <Text className="voice-controls__side-label">朗读</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
