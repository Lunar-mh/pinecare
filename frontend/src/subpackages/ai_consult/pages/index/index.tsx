import { useState, useEffect, useRef, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { Tips, Heart, ArrowRight, Warning } from '@nutui/icons-react-taro';
import { sendConsultMessage, getConsultHistory } from '@/services/modules/ai_consult';
import type { ConsultMessage } from '@/services/types';
import './index.scss';

type VoiceState = 'idle' | 'recording' | 'processing';

const MOCK_PROFILE = {
  chronicDiseases: ['高血压', '糖尿病'],
  allergies: ['青霉素'],
};

const QUICK_QUESTIONS = [
  { label: '血压偏高怎么办', text: '我的血压最近偏高，有什么建议？' },
  { label: '糖尿病饮食', text: '糖尿病患者饮食上有哪些注意事项？' },
  { label: '降压药副作用', text: '长期服用降压药有什么副作用？' },
  { label: '体检指标解读', text: '帮我解读一下体检指标' },
  { label: '运动建议', text: '我适合做哪些运动？' },
  { label: '睡眠不好', text: '最近睡眠质量差，怎么改善？' },
];

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AiConsultIndex() {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const sessionId = useRef('session-' + Date.now());
  const recordManagerRef = useRef<Taro.RecorderManager | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getConsultHistory({ sessionId: sessionId.current, limit: 20 });
      if (res && Array.isArray(res) && res.length > 0) {
        const mapped: LocalMessage[] = (res as ConsultMessage[]).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
        }));
        setMessages(mapped);
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '您好！我是您的AI健康顾问。我已了解您的健康状况，可以为您提供个性化的健康建议。请问有什么可以帮您的吗？',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (_) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '您好！我是您的AI健康顾问。我已了解您的健康状况，可以为您提供个性化的健康建议。请问有什么可以帮您的吗？',
        timestamp: new Date().toISOString(),
      }]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const appendMessage = (msg: LocalMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSendText = async (text: string) => {
    if (!text.trim() || loading) return;
    const content = text.trim();
    setInputText('');
    setShowInput(false);

    const userMsg: LocalMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    appendMessage(userMsg);

    setLoading(true);
    try {
      const reply = await sendConsultMessage({ message: content, sessionId: sessionId.current });
      if (reply) {
        appendMessage({
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: (reply as { reply: string; sessionId: string }).reply,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (_) {
      appendMessage({
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: '抱歉，暂时无法回复，请稍后再试。',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoicePress = () => {
    if (voiceState !== 'idle') return;
    const RecorderManager = Taro.getRecorderManager();
    recordManagerRef.current = RecorderManager;
    RecorderManager.onStart(() => { setVoiceState('recording'); });
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
      const userMsg: LocalMessage = {
        id: 'user-' + Date.now(),
        role: 'user',
        content: '🎤 [语音咨询]',
        timestamp: new Date().toISOString(),
      };
      appendMessage(userMsg);
      try {
        const { sendVoiceConsult } = await import('@/services/modules/ai_consult');
        const reply = await sendVoiceConsult({ audioData: res.tempFilePath, sessionId: sessionId.current });
        if (reply) {
          appendMessage({
            id: 'ai-' + Date.now(),
            role: 'assistant',
            content: (reply as { reply: string; audioData?: string }).reply,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (_) {
        appendMessage({
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: '抱歉，未能识别您的语音，请重试。',
          timestamp: new Date().toISOString(),
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

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  const lastMsgId = messages.length > 0 ? 'msg-' + messages[messages.length - 1].id : undefined;

  return (
    <View className='ai-consult'>
      <View className='ai-consult__header'>
        <View className='ai-consult__header-info'>
          <View className='ai-consult__avatar'>
            <Tips size={28} color='#fff' />
          </View>
          <View>
            <Text className='ai-consult__name'>AI健康顾问</Text>
            <Text className='ai-consult__status'>
              {voiceState === 'processing' || loading ? '思考中...' : '专业健康咨询服务'}
            </Text>
          </View>
        </View>
        <View className='ai-consult__profile-toggle' onClick={() => setProfileExpanded(!profileExpanded)}>
          <Heart size={20} color='#fff' />
        </View>
      </View>

      {profileExpanded && (
        <View className='health-profile'>
          <Text className='health-profile__title'>您的健康档案</Text>
          <View className='health-profile__row'>
            <Text className='health-profile__label'>慢性病：</Text>
            <Text className='health-profile__value'>{MOCK_PROFILE.chronicDiseases.join('、')}</Text>
          </View>
          <View className='health-profile__row'>
            <Text className='health-profile__label'>过敏史：</Text>
            <Text className='health-profile__value'>{MOCK_PROFILE.allergies.join('、')}</Text>
          </View>
        </View>
      )}

      <ScrollView
        className='ai-consult__chat'
        scrollY
        scrollIntoView={lastMsgId}
        scrollWithAnimation
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            id={'msg-' + msg.id}
            className={'bubble-row bubble-row--' + msg.role}
          >
            {msg.role === 'assistant' && (
              <View className='bubble-avatar bubble-avatar--ai'>
                <Tips size={18} color='#fff' />
              </View>
            )}
            <View className={'bubble bubble--' + msg.role}>
              <Text className='bubble__text'>{msg.content}</Text>
              <Text className='bubble__time'>{formatTime(msg.timestamp)}</Text>
            </View>
            {msg.role === 'user' && (
              <View className='bubble-avatar bubble-avatar--user'>
                <Text className='bubble-avatar__text'>我</Text>
              </View>
            )}
          </View>
        ))}
        {loading && (
          <View className='bubble-row bubble-row--assistant'>
            <View className='bubble-avatar bubble-avatar--ai'>
              <Tips size={18} color='#fff' />
            </View>
            <View className='bubble bubble--assistant bubble--loading'>
              <View className='typing-dots'>
                <View className='typing-dots__dot' />
                <View className='typing-dots__dot' />
                <View className='typing-dots__dot' />
              </View>
            </View>
          </View>
        )}
        <View style={{ height: '20px' }} />
      </ScrollView>

      <ScrollView className='quick-questions' scrollX enableFlex>
        {QUICK_QUESTIONS.map((q) => (
          <View
            key={q.label}
            className='quick-q-item'
            onClick={() => handleSendText(q.text)}
          >
            <Text className='quick-q-item__label'>{q.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View className='ai-consult__controls'>
        {showInput ? (
          <View className='text-input-bar'>
            <Input
              className='text-input-bar__input'
              value={inputText}
              placeholder='输入您的健康问题...'
              onInput={(e) => setInputText(e.detail.value)}
              confirmType='send'
              onConfirm={() => handleSendText(inputText)}
              maxlength={200}
            />
            <View className='text-input-bar__send' onClick={() => handleSendText(inputText)}>
              <ArrowRight size={20} color='#fff' />
            </View>
            <View className='text-input-bar__cancel' onClick={() => { setShowInput(false); setInputText(''); }}>
              <Text className='text-input-bar__cancel-text'>取消</Text>
            </View>
          </View>
        ) : (
          <View className='voice-controls'>
            <View className='voice-controls__side' onClick={() => setShowInput(true)}>
              <Text className='voice-controls__side-icon'>⌨️</Text>
              <Text className='voice-controls__side-label'>键盘</Text>
            </View>
            <View
              className={'voice-btn' + (voiceState === 'recording' ? ' voice-btn--recording' : '') + (voiceState === 'processing' ? ' voice-btn--processing' : '')}
              onTouchStart={handleVoicePress}
              onTouchEnd={handleVoiceRelease}
              onTouchCancel={handleVoiceCancel}
            >
              {voiceState === 'idle' && <Heart size={36} color='#fff' />}
              {voiceState === 'recording' && (
                <View className='recording-wave'>
                  <View className='recording-wave__bar' />
                  <View className='recording-wave__bar' />
                  <View className='recording-wave__bar' />
                  <View className='recording-wave__bar' />
                  <View className='recording-wave__bar' />
                </View>
              )}
              {voiceState === 'processing' && <Tips size={32} color='#fff' />}
              <Text className='voice-btn__label'>
                {voiceState === 'idle' ? '按住说话' : voiceState === 'recording' ? '松开发送' : '处理中...'}
              </Text>
            </View>
            <View className='voice-controls__side'>
              <Text className='voice-controls__side-icon'>🔊</Text>
              <Text className='voice-controls__side-label'>朗读</Text>
            </View>
          </View>
        )}
      </View>

      <View className='disclaimer'>
        <Warning size={14} color='#fb8c00' />
        <Text className='disclaimer__text'>本AI建议仅供参考，不替代专业医疗诊断</Text>
      </View>
    </View>
  );
}
