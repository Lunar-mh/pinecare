import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import { Message, Service, Star, Medical, Heart, Trash } from '@nutui/icons-react-taro'
import { Dialog, Toast } from '@nutui/nutui-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { getConsultHistory, getHealthProfile, sendConsultMessage, shouldNotifyFamily, notifyFamilyAboutConsult } from '@/services/modules/ai_consult'
import type { ConsultMessage, HealthProfile } from '@/services/types'
import { useRole } from '@/hooks/useRole'
import './index.scss'

const QUICK_QUESTIONS = [
  { key: 'bp', label: '看血压', description: '高不高？', icon: <Heart size={24} /> },
  { key: 'drug', label: '问用药', description: '怎么吃？', icon: <Star size={24} /> },
  { key: 'doctor', label: '要看医生吗', description: '帮忙判断', icon: <Medical size={24} /> },
  { key: 'diet', label: '能不能吃', description: '忌口查询', icon: <Service size={24} /> },
]

const PROMPTS: Record<string, string> = {
  bp: '请用最简单的话帮我看看最近的血压正不正常。',
  drug: '请帮我看看今天的药有没有要注意的副作用。',
  doctor: '我感觉有点不舒服，请帮我判断什么情况必须去医院。',
  diet: '请告诉我高血压有哪些东西绝对不能吃。',
}

export default function AiConsultIndex() {
  const { isElder } = useRole()
  const [messages, setMessages] = useState<ConsultMessage[]>([])
  const [profile, setProfile] = useState<HealthProfile | null>(null)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNotifyDialog, setShowNotifyDialog] = useState(false)
  const [pendingNotify, setPendingNotify] = useState<{ message: string; urgency: 'low' | 'medium' | 'high'; keywords: string[] } | null>(null)
  const scrollRef = useRef<string>('')
  
  // Use a persistent session ID or generate one
  const sessionId = useMemo(() => `consult-${Date.now()}`, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [history, healthProfile] = await Promise.all([
        getConsultHistory({ sessionId, limit: 20 }),
        getHealthProfile().catch(() => null),
      ])
      
      const list = history || []
      // Reverse to chronological order for chat view
      setMessages(list.slice().reverse())
      setProfile(healthProfile)
      
    } catch (e) {
      console.error('load consult failed', e)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (messages.length > 0) {
       scrollRef.current = `msg-${messages[messages.length - 1].id}`
    }
  }, [messages])

  // 发送消息并检查是否需要通知家属
  const handleSend = async (rawText?: string) => {
    const content = (rawText || inputText).trim()
    if (!content || sending) return

    // 检查是否需要通知家属（仅长辈端）
    if (isElder) {
      const notifyCheck = shouldNotifyFamily(content)
      if (notifyCheck.should) {
        setPendingNotify({ message: content, ...notifyCheck })
        setShowNotifyDialog(true)
        return
      }
    }

    await doSend(content)
  }

  // 实际发送逻辑
  const doSend = async (content: string, notifyFamily = false) => {
    const userMsg: ConsultMessage = {
       id: `local-${Date.now()}`,
       role: 'user',
       content,
       sessionId,
       createdAt: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setSending(true)

    try {
      const reply = await sendConsultMessage({ message: content, sessionId })
      setMessages(prev => [...prev, reply])

      // 如果需要通知家属
      if (notifyFamily && pendingNotify) {
        try {
          await notifyFamilyAboutConsult({
            consultId: reply.id,
            summary: `长辈咨询了关于"${pendingNotify.keywords.join('、')}"的问题`,
            urgency: pendingNotify.urgency,
          })
          Taro.showToast({ title: '已通知家属关注', icon: 'success' })
        } catch (e) {
          console.error('notify family failed', e)
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, {
         id: `err-${Date.now()}`,
         role: 'assistant',
         content: '抱歉，我现在有点连接不畅。',
         sessionId,
         createdAt: new Date().toISOString()
      }])
    } finally {
      setSending(false)
      setPendingNotify(null)
    }
  }

  // 处理通知对话框确认
  const handleNotifyConfirm = () => {
    setShowNotifyDialog(false)
    if (pendingNotify) {
      doSend(pendingNotify.message, true)
    }
  }

  // 处理通知对话框取消（不通知家属，直接发送）
  const handleNotifyCancel = () => {
    setShowNotifyDialog(false)
    if (pendingNotify) {
      doSend(pendingNotify.message, false)
    }
  }

  // --- ELDER VIEW ---
  const renderElderView = () => (
    <PageShell roleTone="elder" className="h-screen flex flex-col bg-yinban-bg">
      <HeroHeader 
        roleTone="elder"
        eyebrow="健康顾问"
        title="哪里不舒服？"
        subtitle="我是您的专属健康助手，可以直接对我说。"
      />

      <ScrollView className="flex-1 px-4 py-2" scrollY scrollIntoView={scrollRef.current}>
         {/* WELCOME */}
         {messages.length === 0 && !loading && (
            <View className="mt-4">
               <Text className="text-gray-500 mb-4 block text-center">您可以试着问问这些：</Text>
               <ActionGrid items={QUICK_QUESTIONS} columns={2} onSelect={key => handleSend(PROMPTS[key])} />
            </View>
         )}

         {/* CHAT */}
         <View className="space-y-4 pb-24">
            {messages.map(msg => (
               <View key={msg.id} id={`msg-${msg.id}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <View className={`max-w-[85%] p-5 rounded-3xl text-lg leading-relaxed shadow-sm ${
                     msg.role === 'user' 
                       ? 'bg-emerald-600 text-white rounded-br-none' 
                       : 'bg-white text-gray-900 rounded-bl-none border border-emerald-50'
                  }`}>
                     <Text>{msg.content}</Text>
                  </View>
               </View>
            ))}
            {sending && (
               <View className="flex justify-start">
                  <View className="bg-white px-5 py-3 rounded-full border border-emerald-50 text-emerald-600 italic">
                     正在思考...
                  </View>
               </View>
            )}
         </View>
      </ScrollView>

      {/* INPUT */}
      <View className="bg-white p-4 pb-8 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
         <View className="flex gap-2">
            <Input 
              className="flex-1 bg-gray-100 h-14 rounded-xl px-4 text-lg" 
              placeholder="例如：我头有点晕"
              value={inputText}
              onInput={e => setInputText(e.detail.value)}
              confirmType="send"
              onConfirm={() => handleSend()}
            />
            <Button 
              className={`h-14 w-24 flex items-center justify-center rounded-xl text-white font-bold border-none m-0 shadow-lg ${
                 inputText ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
              onClick={() => handleSend()}
            >
              问一问
            </Button>
         </View>
      </View>

      {/* 家属通知确认对话框 */}
      <Dialog
        visible={showNotifyDialog}
        title="检测到健康关注点"
        onConfirm={handleNotifyConfirm}
        onCancel={handleNotifyCancel}
        confirmText="通知家属"
        cancelText="不用了"
      >
        <View className="py-4 text-center">
          <Text className="text-lg text-gray-700 block mb-3">
            您提到了"{pendingNotify?.keywords.join('、')}"
          </Text>
          <Text className="text-base text-gray-500 block">
            是否同时通知家属关注您的健康状况？
          </Text>
        </View>
      </Dialog>
    </PageShell>
  )

  // --- FAMILY VIEW ---
  const renderFamilyView = () => (
    <PageShell roleTone="family" className="bg-gray-50 min-h-screen">
       <View className="bg-white p-4 pt-12 shadow-sm sticky top-0 z-10 flex justify-between items-center">
         <View>
           <Text className="text-xl font-bold text-gray-900 block">健康咨询记录</Text>
           <Text className="text-xs text-gray-500">关注长辈的健康困惑点</Text>
         </View>
         <Button size="mini" className="bg-red-50 text-red-500 border-none rounded-full px-3 text-xs m-0">导出记录</Button>
       </View>

       <ScrollView className="p-4" scrollY>
          {loading ? (
             <View className="text-center py-10 text-gray-400">加载中...</View>
          ) : messages.length === 0 ? (
             <View className="text-center py-10 text-gray-400">暂无咨询记录</View>
          ) : (
             <View className="space-y-6">
                {messages.map(msg => (
                  <View key={msg.id} className="flex gap-3">
                     <View className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                     }`}>
                        {msg.role === 'user' ? <Star size={16} /> : <Medical size={16} />}
                     </View>
                     <View className="flex-1">
                        <View className="flex justify-between items-baseline mb-1">
                           <Text className="text-xs font-bold text-gray-600">{msg.role === 'user' ? '长辈提问' : '医生/AI 回复'}</Text>
                           <Text className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</Text>
                        </View>
                        <View className={`p-3 rounded-lg text-sm leading-relaxed ${
                           msg.role === 'user' ? 'bg-white border border-gray-100 shadow-sm' : 'bg-blue-50 text-gray-800'
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
