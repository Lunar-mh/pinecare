import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import { Heart, Message, Service, Star } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { getCompanionGames, getEmotionTrend, getNostalgiaContent, sendCompanionMessage } from '@/services/modules/companion'
import type { ChatMessage, CompanionGame, EmotionTrend, NostalgiaContent } from '@/services/types'
import './index.scss'

const TABS = ['chat', 'games', 'nostalgia'] as const

type TabKey = typeof TABS[number]

export default function AiCompanionIndex() {
  const [tab, setTab] = useState<TabKey>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'assistant', content: '今天想聊点什么？也可以先选一个轻松入口。', timestamp: new Date().toISOString(), type: 'text' }])
  const [games, setGames] = useState<CompanionGame[]>([])
  const [nostalgia, setNostalgia] = useState<NostalgiaContent[]>([])
  const [emotionTrend, setEmotionTrend] = useState<EmotionTrend[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getCompanionGames().then(setGames).catch(() => setGames([]))
    getNostalgiaContent().then(setNostalgia).catch(() => setNostalgia([]))
    getEmotionTrend({ days: 7 }).then(setEmotionTrend).catch(() => setEmotionTrend([]))
  }, [])

  const quickItems = useMemo(() => [
    { key: 'chat', label: '聊聊天', description: '来一句温和的陪伴', icon: <Message size={24} /> },
    { key: 'games', label: '轻游戏', description: '做一个简单的小练习', icon: <Star size={24} /> },
    { key: 'nostalgia', label: '回忆内容', description: '看看老歌和往事片段', icon: <Heart size={24} /> },
    { key: 'comfort', label: '鼓励一句', description: '给我一句今天的鼓励', icon: <Service size={24} /> },
  ], [])

  const handleSend = async (raw?: string) => {
    const content = (raw ?? inputText).trim()
    if (!content || sending) return
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date().toISOString(), type: 'text' }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setSending(true)
    try {
      const reply = await sendCompanionMessage({ message: content })
      setMessages(prev => [...prev, reply])
    } catch (error) {
      console.error('send companion message failed', error)
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: '我在这儿，我们换一句更短的话继续聊。', timestamp: new Date().toISOString(), type: 'text' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <PageShell roleTone="elder" className="companion-page">
      <HeroHeader roleTone="elder" eyebrow="AI 伴聊" title="陪伴、轻松、不过载" subtitle="把陪伴聊天、怀旧内容和小活动收在同一页里，不再分散心智。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="轻松入口" description="先从最轻的一步开始。">
          <ActionGrid items={quickItems} columns={2} onSelect={key => {
            if (key === 'comfort') handleSend('请给我一句温和的鼓励。')
            else setTab(key as TabKey)
          }} />
        </SectionBlock>

        <View className="detail-tabs detail-tabs--3">
          <View className={`detail-tab ${tab === 'chat' ? 'is-active' : ''}`} onClick={() => setTab('chat')}><Text>陪伴对话</Text></View>
          <View className={`detail-tab ${tab === 'games' ? 'is-active' : ''}`} onClick={() => setTab('games')}><Text>轻练习</Text></View>
          <View className={`detail-tab ${tab === 'nostalgia' ? 'is-active' : ''}`} onClick={() => setTab('nostalgia')}><Text>怀旧内容</Text></View>
        </View>

        {tab === 'chat' ? (
          <SectionBlock title="陪伴对话" description="统一和 AI 家族页的消息流样式。">
            <View className="companion-page__messages">
              {messages.map(item => <View key={item.id} className={`companion-page__message companion-page__message--${item.role}`}><Text className="companion-page__message-text">{item.content}</Text></View>)}
              {sending ? <DataPanel tone="info"><Text className="detail-text">正在整理回复...</Text></DataPanel> : null}
            </View>
            <DataPanel tone="primary">
              <Text className="detail-label">想聊什么</Text>
              <Input className="detail-input" value={inputText} placeholder="例如：今天有点闷，陪我聊两句。" onInput={e => setInputText(e.detail.value)} confirmType="send" onConfirm={() => handleSend()} />
              <View className="detail-actions"><View className="detail-button detail-button--primary" onClick={() => handleSend()}><Text>发送</Text></View></View>
            </DataPanel>
          </SectionBlock>
        ) : null}

        {tab === 'games' ? (
          <SectionBlock title="轻练习" description="不做复杂操作，只保留轻量入口。">
            {games.length === 0 ? <EmptyState title="暂时没有练习内容" description="当前保留轻量练习入口，避免给长辈增加额外操作负担。" icon={<Star size={28} />} /> : <View className="detail-stack">{games.map(game => <DataPanel key={game.id} tone="success"><Text className="detail-title">{game.name}</Text><Text className="detail-text">{game.description}</Text><Text className="detail-meta">难度 {game.difficulty}</Text><View className="detail-actions"><View className="detail-button detail-button--primary" onClick={() => handleSend(`我们来玩一下${game.name}。`)}><Text>开始</Text></View></View></DataPanel>)}</View>}
          </SectionBlock>
        ) : null}

        {tab === 'nostalgia' ? (
          <SectionBlock title="怀旧内容" description="图片、故事、老歌入口先统一成推荐卡。">
            <View className="detail-stack">
              {nostalgia.length === 0 ? <EmptyState title="暂时没有怀旧推荐" description="会结合当前偏好持续补充适合回看的内容。" icon={<Heart size={28} />} /> : nostalgia.map((item, index) => <DataPanel key={item.id || index} tone="warning"><Text className="detail-title">{item.title || '怀旧推荐'}</Text><Text className="detail-text">{item.description || '适合陪长辈一起回忆和聊天。'}</Text></DataPanel>)}
              <DataPanel tone="info"><Text className="detail-title">最近情绪趋势</Text><Text className="detail-text">近 7 天记录 {emotionTrend.length} 条，先用统一的数据卡片回看情绪变化。</Text></DataPanel>
            </View>
          </SectionBlock>
        ) : null}
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="elder" label="开始一段陪伴对话" icon={<Heart size={22} />} onClick={() => handleSend('陪我开始今天的聊天吧。')} />
    </PageShell>
  )
}


