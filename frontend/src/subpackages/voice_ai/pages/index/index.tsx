import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import { Message, Microphone, Service, Star } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { clearChatHistory, getChatHistory, sendTextMessage } from '@/services/modules/voice'
import type { ChatMessage } from '@/services/types'
import './index.scss'

const QUICK_COMMANDS = [
  { key: 'health', label: '问身体状态', description: '让助手帮我理解今天的指标', icon: <Star size={24} /> },
  { key: 'medication', label: '问用药提醒', description: '看看接下来要吃什么药', icon: <Service size={24} /> },
  { key: 'family', label: '联系家人', description: '快速组织一句要发给家人的话', icon: <Message size={24} /> },
  { key: 'comfort', label: '陪我聊聊', description: '给我一句温和的陪伴和建议', icon: <Microphone size={24} /> },
]

const QUICK_PROMPTS: Record<string, string> = {
  health: '请用简单的话帮我看看今天的健康状态。',
  medication: '请提醒我今天还有哪些药没有吃。',
  family: '帮我组织一句给家人的报平安消息。',
  comfort: '陪我聊两句，语气温和一点。',
}

export default function VoiceAIIndex() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getChatHistory({ page: 1, pageSize: 20 })
      const list = response?.list || []
      if (list.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: '我是语音助手。你可以直接说出问题，也可以先点下面的常用入口。',
            timestamp: new Date().toISOString(),
            type: 'text',
          },
        ])
      } else {
        setMessages([...list].reverse())
      }
    } catch (loadError) {
      console.error('load voice history failed', loadError)
      setMessages([
        {
          id: 'welcome-fallback',
          role: 'assistant',
          content: '网络有点慢，我们也可以从一条简单的问题开始。',
          timestamp: new Date().toISOString(),
          type: 'text',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSend = async (rawText?: string) => {
    const content = (rawText ?? inputText).trim()
    if (!content || sending) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      type: 'text',
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setSending(true)

    try {
      const reply = await sendTextMessage(content)
      if (reply) {
        setMessages(prev => [...prev, reply])
      }
    } catch (sendError) {
      console.error('send text to voice assistant failed', sendError)
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: '我刚刚没有收到完整内容，我们换一句更短的话再试一次。',
          timestamp: new Date().toISOString(),
          type: 'text',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleClear = () => {
    Taro.showModal({
      title: '清空会话',
      content: '确认后会删除当前语音助手对话记录。',
      success: async res => {
        if (!res.confirm) return
        try {
          await clearChatHistory()
          await loadHistory()
        } catch (clearError) {
          console.error('clear chat history failed', clearError)
          Taro.showToast({ title: '清空失败，请稍后再试', icon: 'none' })
        }
      },
    })
  }

  const actionItems = useMemo(() => QUICK_COMMANDS, [])

  return (
    <PageShell roleTone="elder" className="voice-overview-page">
      <HeroHeader
        roleTone="elder"
        eyebrow="语音入口"
        title="像和照护助手说话一样自然"
        subtitle="把常用问题、消息流和输入区收在一起，减少切页和认知负担。"
        aside={<View className="voice-overview-page__clear" onClick={handleClear}><Text>清空记录</Text></View>}
      />

      <ScrollView className="voice-overview-page__scroll" scrollY>
        <SectionBlock title="常用入口" description="不知道怎么开口时，先选一个常用问题。">
          <ActionGrid items={actionItems} columns={2} onSelect={key => handleSend(QUICK_PROMPTS[key])} />
        </SectionBlock>

        <SectionBlock title="对话内容" description="统一消息流样式，语音和文字都落在同一个上下文里。">
          {loading ? (
            <DataPanel tone="info"><Text className="voice-overview-page__hint">正在载入最近的对话...</Text></DataPanel>
          ) : messages.length === 0 ? (
            <EmptyState title="还没有对话记录" description="从底部输入框输入一句话，或者先点一个常用入口。" icon={<Message size={28} />} />
          ) : (
            <View className="voice-overview-page__message-list">
              {messages.map(item => (
                <View key={item.id} className={`voice-overview-page__message voice-overview-page__message--${item.role}`}>
                  <Text className="voice-overview-page__message-text">{item.content}</Text>
                  <Text className="voice-overview-page__message-time">{new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
              {sending ? (
                <DataPanel tone="info"><Text className="voice-overview-page__hint">助手正在组织回复...</Text></DataPanel>
              ) : null}
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="输入区" description="支持一句话直问，下一阶段可继续接入长按语音。">
          <DataPanel tone="primary">
            <Input
              className="voice-overview-page__input"
              value={inputText}
              placeholder="例如：今天我还需要做什么？"
              onInput={event => setInputText(event.detail.value)}
              confirmType="send"
              onConfirm={() => handleSend()}
            />
            <View className="voice-overview-page__send-row">
              <View className="voice-overview-page__send-btn" onClick={() => handleSend()}><Text>{sending ? '发送中...' : '发送文字'}</Text></View>
            </View>
          </DataPanel>
        </SectionBlock>

        <View className="voice-overview-page__bottom-space" />
      </ScrollView>

      <StickyPrimaryAction tone="elder" label="开始一段新对话" icon={<Microphone size={22} />} onClick={() => handleSend('请陪我开始今天的对话。')} />
    </PageShell>
  )
}
