import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { Heart, ArrowRight, Tips } from '@nutui/icons-react-taro';
import {
  sendCompanionMessage,
  getCompanionGames,
  getNostalgiaContent,
} from '@/services/modules/companion';
import type { CompanionGame, NostalgiaContent } from '@/services/types';
import './index.scss';

type TabKey = 'chat' | 'games' | 'nostalgia';

const DECADES = ['50年代', '60年代', '70年代', '80年代'];

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AiCompanionIndex() {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  // Chat
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  // Games
  const [games, setGames] = useState<CompanionGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  // Nostalgia
  const [nostalgia, setNostalgia] = useState<NostalgiaContent[]>([]);
  const [selectedDecade, setSelectedDecade] = useState('');
  const [nostalgiaLoading, setNostalgiaLoading] = useState(false);

  // Initialize chat
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是您的AI陪伴助手。我可以陪您聊天、玩游戏，还能为您推荐怀旧内容。有什么想聊的吗？😊',
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const loadGames = useCallback(async () => {
    if (games.length > 0) return;
    setGamesLoading(true);
    try {
      const res = await getCompanionGames();
      if (res && Array.isArray(res)) {
        setGames(res as CompanionGame[]);
      } else {
        // Fallback games
        setGames([
          { id: '1', type: 'memory', name: '记忆训练', description: '测试您的记忆力，找出匹配的图片', difficulty: 1, icon: '🧠' },
          { id: '2', type: 'matching', name: '图形匹配', description: '将相同的图案两两配对', difficulty: 2, icon: '🎯' },
          { id: '3', type: 'word', name: '词语接龙', description: '用汉字开头进行词语接龙', difficulty: 1, icon: '📝' },
        ]);
      }
    } catch (_) {
      setGames([
        { id: '1', type: 'memory', name: '记忆训练', description: '测试您的记忆力，找出匹配的图片', difficulty: 1, icon: '🧠' },
        { id: '2', type: 'matching', name: '图形匹配', description: '将相同的图案两两配对', difficulty: 2, icon: '🎯' },
        { id: '3', type: 'word', name: '词语接龙', description: '用汉字开头进行词语接龙', difficulty: 1, icon: '📝' },
      ]);
    } finally {
      setGamesLoading(false);
    }
  }, [games.length]);

  const loadNostalgia = useCallback(async (decade?: string) => {
    setNostalgiaLoading(true);
    try {
      const res = await getNostalgiaContent(decade ? { decade } : undefined);
      if (res && Array.isArray(res)) {
        setNostalgia(res as NostalgiaContent[]);
      }
    } catch (_) {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setNostalgiaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'games') {
      loadGames();
    } else if (activeTab === 'nostalgia' && nostalgia.length === 0) {
      loadNostalgia();
    }
  }, [activeTab, loadGames, loadNostalgia, nostalgia.length]);

  const handleDecadeSelect = (decade: string) => {
    const next = selectedDecade === decade ? '' : decade;
    setSelectedDecade(next);
    loadNostalgia(next || undefined);
  };

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
      const reply = await sendCompanionMessage({ message: content });
      if (reply) {
        appendMessage({
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: (reply as { id: string; role: 'user' | 'assistant'; content: string; timestamp?: string }).content || '收到！',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (_) {
      appendMessage({
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: '抱歉，我暂时没法回复，请稍后再试。',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayGame = (game: CompanionGame) => {
    Taro.showToast({ title: '正在开启' + game.name + '...', icon: 'none', duration: 1500 });
  };

  const difficultyDots = (level: number) => {
    return Array.from({ length: 3 }, (_, i) => i < level);
  };

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  const typeIcon = (type: string) => {
    if (type === 'music') return '🎵';
    if (type === 'story') return '📖';
    return '🖼️';
  };

  const lastMsgId = messages.length > 0 ? 'msg-' + messages[messages.length - 1].id : undefined;

  return (
    <View className='ai-companion'>
      {/* 顶部 */}
      <View className='ai-companion__header'>
        <View className='ai-companion__header-info'>
          <View className='ai-companion__avatar'>
            <Heart size={28} color='#fff' />
          </View>
          <View>
            <Text className='ai-companion__name'>AI陪伴</Text>
            <Text className='ai-companion__status'>您的贴心伙伴</Text>
          </View>
        </View>
      </View>

      {/* Tab 导航 */}
      <View className='companion-tabs'>
        {(['chat', 'games', 'nostalgia'] as TabKey[]).map((tab) => (
          <View
            key={tab}
            className={'companion-tab' + (activeTab === tab ? ' companion-tab--active' : '')}
            onClick={() => setActiveTab(tab)}
          >
            <Text className='companion-tab__text'>
              {tab === 'chat' ? '💬 聊天' : tab === 'games' ? '🎮 游戏' : '🎵 怀旧'}
            </Text>
          </View>
        ))}
      </View>

      {/* 聊天 Tab */}
      {activeTab === 'chat' && (
        <>
          <ScrollView
            className='ai-companion__chat'
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
                    <Heart size={18} color='#fff' />
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
                  <Heart size={18} color='#fff' />
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

          <View className='ai-companion__controls'>
            {showInput ? (
              <View className='text-input-bar'>
                <Input
                  className='text-input-bar__input'
                  value={inputText}
                  placeholder='和我聊聊吧...'
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
              <View className='chat-quick-bar'>
                <View className='chat-quick-btn' onClick={() => setShowInput(true)}>
                  <Text className='chat-quick-btn__icon'>⌨️</Text>
                  <Text className='chat-quick-btn__label'>发消息</Text>
                </View>
                <View className='chat-quick-btn' onClick={() => handleSendText('今天天气怎么样？')}>
                  <Text className='chat-quick-btn__icon'>🌤️</Text>
                  <Text className='chat-quick-btn__label'>聊天气</Text>
                </View>
                <View className='chat-quick-btn' onClick={() => handleSendText('给我讲个笑话吧')}>
                  <Text className='chat-quick-btn__icon'>😄</Text>
                  <Text className='chat-quick-btn__label'>讲笑话</Text>
                </View>
                <View className='chat-quick-btn' onClick={() => handleSendText('今天有什么养生小知识？')}>
                  <Text className='chat-quick-btn__icon'>💡</Text>
                  <Text className='chat-quick-btn__label'>养生知识</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {/* 游戏 Tab */}
      {activeTab === 'games' && (
        <ScrollView className='games-panel' scrollY>
          {gamesLoading ? (
            <View className='empty-hint'>
              <Text className='empty-hint__text'>加载中...</Text>
            </View>
          ) : (
            <View className='games-grid'>
              {games.map((game) => (
                <View key={game.id} className='game-card' onClick={() => handlePlayGame(game)}>
                  <Text className='game-card__icon'>{game.icon}</Text>
                  <Text className='game-card__name'>{game.name}</Text>
                  <Text className='game-card__desc'>{game.description}</Text>
                  <View className='game-card__difficulty'>
                    {difficultyDots(game.difficulty).map((active, i) => (
                      <View
                        key={i}
                        className={'difficulty-dot' + (active ? ' difficulty-dot--active' : '')}
                      />
                    ))}
                  </View>
                  <View className='game-card__play'>
                    <Tips size={16} color='#fff' />
                    <Text className='game-card__play-text'>开始游戏</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: '32px' }} />
        </ScrollView>
      )}

      {/* 怀旧 Tab */}
      {activeTab === 'nostalgia' && (
        <ScrollView className='nostalgia-panel' scrollY>
          {/* 年代筛选 */}
          <ScrollView className='decade-filter' scrollX enableFlex>
            <View
              className={'decade-chip' + (!selectedDecade ? ' decade-chip--active' : '')}
              onClick={() => handleDecadeSelect('')}
            >
              <Text className='decade-chip__text'>全部</Text>
            </View>
            {DECADES.map((decade) => (
              <View
                key={decade}
                className={'decade-chip' + (selectedDecade === decade ? ' decade-chip--active' : '')}
                onClick={() => handleDecadeSelect(decade)}
              >
                <Text className='decade-chip__text'>{decade}</Text>
              </View>
            ))}
          </ScrollView>

          {nostalgiaLoading ? (
            <View className='empty-hint'>
              <Text className='empty-hint__text'>加载中...</Text>
            </View>
          ) : nostalgia.length === 0 ? (
            <View className='empty-hint'>
              <Text className='empty-hint__text'>暂无怀旧内容</Text>
            </View>
          ) : (
            <View className='nostalgia-list'>
              {nostalgia.map((item) => (
                <View key={item.id} className='nostalgia-card'>
                  <View className='nostalgia-card__icon-wrap'>
                    <Text className='nostalgia-card__type-icon'>{typeIcon(item.type)}</Text>
                  </View>
                  <View className='nostalgia-card__content'>
                    <Text className='nostalgia-card__title'>{item.title}</Text>
                    {item.description && (
                      <Text className='nostalgia-card__desc'>{item.description}</Text>
                    )}
                    <View className='nostalgia-card__meta'>
                      <Text className='nostalgia-card__decade'>{item.decade}</Text>
                      <Text className='nostalgia-card__type-label'>
                        {item.type === 'music' ? '音乐' : item.type === 'story' ? '故事' : '图片'}
                      </Text>
                    </View>
                  </View>
                  <View className='nostalgia-card__play'>
                    <ArrowRight size={20} color='#ad1457' />
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: '32px' }} />
        </ScrollView>
      )}
    </View>
  );
}
