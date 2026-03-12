import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import { Message, Service, Star } from '@nutui/icons-react-taro'
import { ActionGrid, DataPanel, EmptyState, HeroHeader, PageShell, SectionBlock, StickyPrimaryAction } from '@/components/shell'
import { getConsultHistory, getHealthProfile, sendConsultMessage } from '@/services/modules/ai_consult'
import type { ConsultMessage, HealthProfile } from '@/services/types'
import './index.scss'

const QUICK_QUESTIONS = [
  { key: 'bp', label: '看血压', description: '让我用简单的话解释今天的血压', icon: <Service size={24} /> },
  { key: 'drug', label: '问用药', description: '帮我确认今天的服药注意点', icon: <Star size={24} /> },
  { key: 'doctor', label: '是否就医', description: '帮我判断要不要及时问医生', icon: <Message size={24} /> },
  { key: 'family', label: '发给家属', description: '整理一句给家人的说明', icon: <Star size={24} /> },
]

const QUESTION_MAP: Record<string, string> = {
  bp: '请用长辈容易理解的话解释我今天的血压。',
  drug: '请提醒我今天用药上最需要注意的地方。',
  doctor: '请帮我判断什么情况需要尽快联系医生。',
  family: '请帮我整理一句发给家属的健康说明。',
}

export default function AiConsultIndex() {
  const [messages, setMessages] = useState<ConsultMessage[]>([])
  const [profile, setProfile] = useState<HealthProfile | null>(null)
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const sessionId = useMemo(() => `consult-${Date.now()}`, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [history, healthProfile] = await Promise.all([
        getConsultHistory({ sessionId, limit: 20 }),
        getHealthProfile().catch(() => null),
      ])
      setMessages(
        history?.length
          ? history
          : [{ id: 'welcome', role: 'assistant', content: '先说你最担心的一个问题，我会尽量用直白的话回答。', sessionId, createdAt: new Date().toISOString() }],
      )
      setProfile(healthProfile)
    } catch (error) {
      console.error('load ai consult failed', error)
      setMessages([{ id: 'fallback', role: 'assistant', content: '网络有点慢，我们也可以从一句简短的问题开始。', sessionId, createdAt: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { loadData() }, [loadData])

  const handleSend = async (raw?: string) => {
    const content = (raw ?? inputText).trim()
    if (!content || sending) return
    const userMessage: ConsultMessage = { id: `user-${Date.now()}`, role: 'user', content, sessionId, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setSending(true)
    try {
      const reply = await sendConsultMessage({ message: content, sessionId })
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: reply.reply, sessionId: reply.sessionId, createdAt: new Date().toISOString() }])
    } catch (error) {
      console.error('send consult message failed', error)
      setMessages(prev => [...prev, { id: `assistant-error-${Date.now()}`, role: 'assistant', content: '我刚刚没有完整收到内容，我们换一句更短的话再试一次。', sessionId, createdAt: new Date().toISOString() }])
    } finally {
      setSending(false)
    }
  }

  return (
    <PageShell roleTone="family" className="consult-page">
      <HeroHeader roleTone="family" eyebrow="AI 健康咨询" title="把复杂解释成听得懂的话" subtitle="统一消息流、建议卡和输入区，让咨询页和语音页保持同一家族体验。" />
      <ScrollView className="detail-shell-scroll" scrollY>
        <SectionBlock title="常用问题" description="不知道从哪里开始，就先点一个最接近的。">
          <ActionGrid items={QUICK_QUESTIONS} columns={2} onSelect={key => handleSend(QUESTION_MAP[key])} />
        </SectionBlock>

        <SectionBlock title="健康背景" description="有资料就显示，没有也不打断咨询。">
          {!profile ? (
            <EmptyState title="暂未同步健康档案" description="你仍然可以直接发起咨询，助手会按你当前的问题回答。" icon={<Service size={28} />} />
          ) : (
            <View className="detail-stack">
              <DataPanel tone="primary"><Text className="detail-title">基础信息</Text><Text className="detail-text">年龄 {profile.age || '--'} · {profile.gender === 'female' ? '女' : profile.gender === 'male' ? '男' : '未设置'}</Text></DataPanel>
              <DataPanel tone="warning"><Text className="detail-title">慢病与过敏</Text><Text className="detail-text">慢病：{profile.chronicDiseases?.join('、') || '暂无'}；过敏：{profile.allergies?.join('、') || '暂无'}</Text></DataPanel>
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="咨询消息" description="问题和建议放在同一个上下文里，便于家属或长辈回看。">
          {loading ? <DataPanel tone="info"><Text className="detail-text">正在载入最近咨询内容...</Text></DataPanel> : (
            <View className="consult-page__messages">
              {messages.map(item => (
                <View key={item.id} className={`consult-page__message consult-page__message--${item.role}`}>
                  <Text className="consult-page__message-text">{item.content}</Text>
                  <Text className="consult-page__message-time">{new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
              {sending ? <DataPanel tone="info"><Text className="detail-text">正在生成建议...</Text></DataPanel> : null}
            </View>
          )}
        </SectionBlock>

        <SectionBlock title="输入区" description="支持一句话直问，当前先把核心健康问答和背景资料放在同一页。">
          <DataPanel tone="primary">
            <Text className="detail-label">输入你的问题</Text>
            <Input className="detail-input" value={inputText} placeholder="例如：今天这个数值严重吗？" onInput={e => setInputText(e.detail.value)} confirmType="send" onConfirm={() => handleSend()} />
            <View className="detail-actions"><View className="detail-button detail-button--family-primary" onClick={() => handleSend()}><Text>{sending ? '发送中...' : '发送问题'}</Text></View></View>
          </DataPanel>
        </SectionBlock>
        <View className="detail-bottom-space" />
      </ScrollView>
      <StickyPrimaryAction tone="family" label="发起一次新咨询" icon={<Message size={22} />} onClick={() => handleSend('请先帮我理解今天最需要注意的健康问题。')} />
    </PageShell>
  )
}

