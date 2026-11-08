import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import { Message, Microphone, Service, Star, Check, PlayStart } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { clearChatHistory, getChatHistory, sendTextMessage } from '@/services/modules/voice'
import type { ChatMessage } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

const QUICK_COMMANDS = [
  { key: 'health', label: '我的身体', description: '帮我看看今天的指标', icon: <Star size={24} /> },
  { key: 'medication', label: '吃药提醒', description: '今天还要吃什么药', icon: <Service size={24} /> },
  { key: 'family', label: '联系家人', description: '我想给家里人发个话', icon: <Message size={24} /> },
  { key: 'comfort', label: '陪我聊天', description: '随便聊聊，解解闷', icon: <Microphone size={24} /> },
]

const QUICK_PROMPTS: Record<string, string> = {
  health: '请用简单的话帮我看看今天的健康状态。',
  medication: '请提醒我今天还有哪些药没有吃。',
  family: '帮我组织一句给家人的报平安消息。',
  comfort: '陪我聊两句，语气温和一点。',
}

export default function VoiceAIIndex() {
  const { isElder } = useRole()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<string>('')

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getChatHistory({ page: 1, pageSize: 20 })
      const list = response?.list || []
      // Reverse to show oldest first in chat view
      setMessages(list.slice().reverse())
    } catch (e) {
      console.error('load voice history failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current = `msg-${messages[messages.length - 1].id}`
    }
  }, [messages])

  const handleSend = async (rawText?: string) => {
    const content = (rawText || inputText).trim()
    if (!content || sending) return

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setSending(true)

    try {
      const reply = await sendTextMessage(content)
      setMessages(prev => [...prev, reply])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，我现在有点累，请稍后再试。',
        timestamp: new Date().toISOString(),
        type: 'text'
      }])
    } finally {
      setSending(false)
    }
  }

  const handleClear = () => {
    Taro.showModal({
      title: '清空会话',
      content: '确定要删除所有的对话记录吗？',
      success: async res => {
        if (res.confirm) {
          await clearChatHistory()
          setMessages([])
        }
      }
    })
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="bg-yinban-bg h-screen flex flex-col">
      <HeroHeader
        roleTone="elder"
        eyebrow="语音助手"
        title="有什么事，直接跟我说"
        subtitle="您可以打字，也可以按住下面的按钮说话。"
        aside={<View className="bg-white/20 px-3 py-1 rounded-full text-white text-sm" onClick={handleClear}>清空</View>}
      />

      <ScrollView className="flex-1 px-4 py-2" scrollY scrollIntoView={scrollRef.current}>
        {/* WELCOME / EMPTY STATE */}
        {messages.length === 0 && !loading && (
          <View className="mt-4">
             <Text className="text-gray-500 mb-4 block text-center">您可以试着点一点下面的卡片：</Text>
             <ActionGrid items={QUICK_COMMANDS} columns={2} onSelect={key => handleSend(QUICK_PROMPTS[key])} />
          </View>
        )}

        {/* CHAT BUBBLES */}
        <View className="space-y-4 pb-24">
           {messages.map(msg => (
             <View key={msg.id} id={`msg-${msg.id}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <View className={`max-w-[80%] p-4 rounded-2xl text-lg leading-relaxed ${
                   msg.role === 'user' 
                     ? 'bg-blue-600 text-white rounded-br-none' 
                     : 'bg-white text-gray-900 shadow-sm rounded-bl-none'
                }`}>
                   <Text>{msg.content}</Text>
                </View>
             </View>
           ))}
           {sending && (
             <View className="flex justify-start">
                <View className="bg-gray-100 px-4 py-2 rounded-full flex items-center">
                   <View className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1" />
                   <View className="w-2 h-2 bg-gray-400 rounded-full animate-bounce mr-1 delay-100" />
                   <View className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </View>
             </View>
           )}
        </View>
      </ScrollView>

      {/* INPUT AREA */}
      <View className="bg-white p-4 pb-8 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
         <View className="flex gap-2">
            <Input 
              className="flex-1 bg-gray-100 h-12 rounded-xl px-4 text-lg" 
              placeholder="在这里输入..."
              value={inputText}
              onInput={e => setInputText(e.detail.value)}
              confirmType="send"
              onConfirm={() => handleSend()}
            />
            <Button 
              className={`h-12 w-20 flex items-center justify-center rounded-xl text-white font-bold border-none m-0 ${
                 inputText ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              onClick={() => handleSend()}
            >
              发送
            </Button>
         </View>
      </View>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
         <View>
           <Text className="text-xl font-bold text-gray-900 block">AI 对话记录</Text>
           <Text className="text-xs text-gray-500">查看长辈与语音助手的交互历史</Text>
         </View>
         <Button size="mini" className="bg-gray-100 text-gray-500 border-none rounded-full px-3 text-xs m-0" onClick={handleClear}>清空记录</Button>
       </View>

       <ScrollView className="p-4" scrollY>
          {loading ? (
             <View className="text-center py-10 text-gray-400">加载中...</View>
          ) : messages.length === 0 ? (
             <View className="text-center py-10 text-gray-400">暂无对话记录</View>
          ) : (
             <View className="space-y-6">
                {messages.map(msg => (
                  <View key={msg.id} className="flex gap-3">
                     <View className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                     }`}>
                        {msg.role === 'user' ? <Service size={16} /> : <Microphone size={16} />}
                     </View>
                     <View className="flex-1">
                        <View className="flex justify-between items-baseline mb-1">
                           <Text className="text-xs font-bold text-gray-600">{msg.role === 'user' ? '长辈' : 'AI 助手'}</Text>
                           <Text className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleString()}</Text>
                        </View>
                        <View className={`p-3 rounded-lg text-sm leading-relaxed ${
                           msg.role === 'user' ? 'bg-white border border-gray-100' : 'bg-purple-50 text-gray-800'
                        }`}>
                           <Text>{msg.content}</Text>
                        </View>
                     </View>
                  </View>
                ))}
             </View>
          )}
       </ScrollView>
    </PageShell>
  )

  return isElder ? renderElderView() : renderFamilyView()
}
